import "server-only";

import { cohereRerank } from "@/lib/cohere/rerank";
import { namesMatchFuzzy, normalizeName } from "@/lib/kg/normalize";
import { prisma } from "@/lib/prisma";
import { JOURNAL_ROOT } from "@/lib/journal/paths";
import { parseJournalFile } from "@/lib/journal/markdown";
import type { ContextBlock } from "@/lib/chat/types";
import { isMnemosyneConfigured } from "@/lib/mnemosyne/hooks";
import { vectorSearchMemory } from "@/lib/mnemosyne/search";
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

const RECALL_LIMIT = 20;

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

function dedupeKey(hit: HybridSearchHit): string {
  return `${hit.source}::${hit.title}`;
}

function mergeCandidateHits(hits: HybridSearchHit[]): HybridSearchHit[] {
  const map = new Map<string, HybridSearchHit>();

  for (const hit of hits) {
    const key = dedupeKey(hit);
    const existing = map.get(key);
    if (!existing || hit.score > existing.score) {
      map.set(key, hit);
    }
  }

  return [...map.values()];
}

async function lexicalSearch(
  query: string,
  tokens: string[],
  mentionedIds: Set<string>,
): Promise<HybridSearchHit[]> {
  const hits: HybridSearchHit[] = [];

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

  const journalHits = await searchJournalEntries(query, tokens, 5);
  hits.push(...journalHits);

  return hits
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    })
    .slice(0, RECALL_LIMIT);
}

async function rerankHits(
  query: string,
  hits: HybridSearchHit[],
  limit: number,
): Promise<HybridSearchHit[]> {
  if (hits.length === 0) return [];

  try {
    const documents = hits.map((hit) => ({
      text: `${hit.title}\n${hit.body}`,
      hit,
    }));

    const reranked = await cohereRerank({
      query,
      documents,
      topN: Math.min(limit, documents.length),
    });

    return reranked.map((result) => ({
      ...result.document.hit,
      score: result.relevanceScore,
    }));
  } catch (error) {
    console.error("Mnemosyne rerank fallback:", error);
    return hits.slice(0, limit);
  }
}

export async function hybridSearch(
  input: HybridSearchInput,
): Promise<HybridSearchHit[]> {
  const query = input.query.trim();
  if (!query) return [];

  const tokens = tokenize(query);
  const limit = input.limit ?? 8;
  const mentionedIds = new Set(input.mentionedNodeIds ?? []);

  const lexicalHits = await lexicalSearch(query, tokens, mentionedIds);

  let vectorHits: HybridSearchHit[] = [];
  if (await isMnemosyneConfigured()) {
    try {
      const memoryHits = await vectorSearchMemory({ query, limit: RECALL_LIMIT });
      vectorHits = memoryHits.map((hit) => ({
        title: hit.title,
        body: hit.body,
        score: hit.score * 10,
        source: hit.source,
        createdAt: hit.createdAt,
      }));
    } catch (error) {
      console.error("Mnemosyne vector search fallback:", error);
    }
  }

  const merged = mergeCandidateHits([...lexicalHits, ...vectorHits])
    .sort((a, b) => b.score - a.score)
    .slice(0, RECALL_LIMIT);

  if (merged.length === 0) return [];

  if (await isMnemosyneConfigured()) {
    return rerankHits(query, merged, limit);
  }

  return merged.slice(0, limit);
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
