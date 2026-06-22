import "server-only";

import { namesMatchFuzzy, normalizeName } from "@/lib/kg/normalize";
import { prisma } from "@/lib/prisma";
import { JOURNAL_ROOT } from "@/lib/journal/paths";
import { parseJournalFile } from "@/lib/journal/markdown";
import type { ContextBlock } from "@/lib/chat/types";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type HybridSearchInput = {
  query: string;
  mentionedNodeIds?: string[];
  limit?: number;
};

export type HybridSearchHit = {
  title: string;
  body: string;
  score: number;
  source: string;
  createdAt?: string;
};

function tokenize(query: string): string[] {
  return normalizeName(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreText(text: string, query: string, tokens: string[]): number {
  const normalized = normalizeName(text);
  if (!normalized) return 0;
  if (namesMatchFuzzy(text, query)) return 10;

  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) score += 4;
  }
  return score;
}

export async function hybridSearch(
  input: HybridSearchInput,
): Promise<HybridSearchHit[]> {
  const query = input.query.trim();
  if (!query) return [];

  const tokens = tokenize(query);
  const limit = input.limit ?? 8;
  const hits: HybridSearchHit[] = [];
  const mentionedIds = new Set(input.mentionedNodeIds ?? []);

  const mentions = await prisma.kgMention.findMany({
    where: mentionedIds.size
      ? { nodeId: { in: [...mentionedIds] } }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { node: true },
  });

  for (const mention of mentions) {
    const score =
      scoreText(mention.fragment, query, tokens) +
      (mentionedIds.has(mention.nodeId) ? 3 : 0);
    if (score <= 0) continue;
    hits.push({
      title: `Mención · ${mention.node.primaryName}`,
      body: mention.fragment,
      score: score + 1,
      source: `${mention.sourceType}:${mention.sourceId}`,
      createdAt: mention.createdAt.toISOString(),
    });
  }

  if (mentionedIds.size > 0) {
    const edges = await prisma.kgEdge.findMany({
      where: {
        OR: [
          { sourceNodeId: { in: [...mentionedIds] } },
          { targetNodeId: { in: [...mentionedIds] } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { sourceNode: true, targetNode: true },
    });

    for (const edge of edges) {
      const score = scoreText(edge.context, query, tokens);
      if (score <= 0) continue;
      hits.push({
        title: `Relación ${edge.relationType}: ${edge.sourceNode.primaryName} → ${edge.targetNode.primaryName}`,
        body: edge.context,
        score,
        source: "kg_edge",
        createdAt: edge.createdAt.toISOString(),
      });
    }
  }

  const journalHits = await searchJournalEntries(query, tokens, 3);
  hits.push(...journalHits);

  return hits
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    })
    .slice(0, limit);
}

async function searchJournalEntries(
  query: string,
  tokens: string[],
  limit: number,
): Promise<HybridSearchHit[]> {
  let monthDirs: string[];
  try {
    monthDirs = await readdir(JOURNAL_ROOT);
  } catch {
    return [];
  }

  const hits: HybridSearchHit[] = [];

  for (const monthDirName of monthDirs.sort().reverse()) {
    const monthDir = path.join(JOURNAL_ROOT, monthDirName);
    let files: string[];
    try {
      files = await readdir(monthDir);
    } catch {
      continue;
    }

    for (const filename of files) {
      if (!filename.endsWith(".md")) continue;
      const filePath = path.join(monthDir, filename);
      const source = await readFile(filePath, "utf-8");
      const relativePath = path.posix.join("journal", monthDirName, filename);
      const parsed = parseJournalFile(source, relativePath);
      if (!parsed) continue;

      const haystack = [
        parsed.title,
        parsed.body,
        parsed.onda,
        parsed.fechaRegistro,
      ].join(" ");

      const score = scoreText(haystack, query, tokens);
      if (score <= 0) continue;

      hits.push({
        title: `Diario · ${parsed.title}`,
        body: parsed.previewLines.join("\n") || parsed.body.slice(0, 400),
        score,
        source: relativePath,
        createdAt: parsed.fechaRegistro,
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function hybridHitsToBlocks(hits: HybridSearchHit[]): ContextBlock[] {
  return hits.map((hit, index) => ({
    title: hit.title,
    body: hit.body,
    priority: 40 - index,
  }));
}
