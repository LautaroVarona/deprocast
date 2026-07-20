import "server-only";

import { getNeighborhood } from "@/lib/kg/queries";
import { prisma } from "@/lib/prisma";
import { getMemoryIndexPath, getSessionsDir } from "@/lib/memory/paths";
import { readFile } from "node:fs/promises";
import path from "node:path";

const TOKEN_BUDGET = 600;
const CHARS_PER_TOKEN = 4;
const BUDGET_CHARS = TOKEN_BUDGET * CHARS_PER_TOKEN;

export type RecallPointer = {
  label: string;
  path?: string;
  sessionId?: string;
  preview: string;
};

export type RecallPathResult = {
  pointers: RecallPointer[];
  kgNeighborhoodSnippets: string[];
  text: string;
  approxTokens: number;
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function parseIndexPointers(indexMd: string): RecallPointer[] {
  const pointers: RecallPointer[] = [];
  const lineRe =
    /^- \[([^\]]+)\]\(([^)]+)\)(?: · `([^`]+)`)?(?: — (.+))?$/gm;
  let match: RegExpExecArray | null;
  while ((match = lineRe.exec(indexMd)) !== null) {
    pointers.push({
      label: match[1],
      path: match[2],
      sessionId: match[3],
      preview: (match[4] ?? "").trim(),
    });
  }
  return pointers;
}

function scorePointer(pointer: RecallPointer, query: string): number {
  const q = query.toLowerCase();
  if (!q) return 0;
  let score = 0;
  const hay = `${pointer.label} ${pointer.preview}`.toLowerCase();
  for (const token of q.split(/\s+/).filter((t) => t.length > 2)) {
    if (hay.includes(token)) score += 1;
  }
  return score;
}

/**
 * Recall de bajo costo (~600 tokens): INDEX.md → punteros → KG profundidad 1.
 */
export async function buildRecallPath(input: {
  query: string;
  mentionedNodeIds?: string[];
}): Promise<RecallPathResult> {
  const parts: string[] = [];
  const pointers: RecallPointer[] = [];
  const kgNeighborhoodSnippets: string[] = [];

  let indexMd = "";
  try {
    indexMd = await readFile(getMemoryIndexPath(), "utf-8");
  } catch {
    indexMd = "";
  }

  if (indexMd) {
    const all = parseIndexPointers(indexMd);
    const rankedScored = all
      .map((p) => ({ p, score: scorePointer(p, input.query) }))
      .sort((a, b) => b.score - a.score);

    const ranked = rankedScored.slice(0, 5).map((x) => x.p);
    pointers.push(...ranked);

    if (ranked.length > 0) {
      parts.push("## Punteros de memoria (INDEX)");
      for (const pointer of ranked) {
        parts.push(
          `- ${pointer.label}${pointer.path ? ` → ${pointer.path}` : ""}${
            pointer.preview ? `: ${pointer.preview}` : ""
          }`,
        );
      }
    }

    const bestHit = rankedScored[0];
    if (bestHit && bestHit.score > 0 && bestHit.p.path) {
      try {
        const absolute = path.join(
          path.dirname(getMemoryIndexPath()),
          bestHit.p.path,
        );
        const body = (await readFile(absolute, "utf-8")).slice(0, 900);
        parts.push("", "## Átomo exacto", body);
      } catch {
        // ignore missing file
      }
    }
  }

  const nodeIds: string[] = [
    ...new Set(input.mentionedNodeIds ?? []),
  ].slice(0, 3);
  if (nodeIds.length === 0 && input.query.trim()) {
    const nodes = await prisma.kgNode.findMany({
      where: {
        primaryName: { contains: input.query.split(/\s+/)[0] ?? "" },
      },
      take: 2,
      select: { id: true },
    });
    nodeIds.push(...nodes.map((n) => n.id));
  }

  for (const nodeId of nodeIds) {
    const neighborhood = await getNeighborhood(nodeId);
    if (!neighborhood) continue;
    const edges = neighborhood.edges
      .slice(0, 4)
      .map(
        (e) =>
          `${neighborhood.node.primaryName} -[${e.relationType}]-> ${e.neighbor.primaryName}`,
      );
    if (edges.length) {
      const snippet = edges.join("; ");
      kgNeighborhoodSnippets.push(snippet);
      parts.push("", `## KG vecindario (${neighborhood.node.primaryName})`, snippet);
    }
  }

  let text = parts.join("\n").trim();
  if (estimateTokens(text) > TOKEN_BUDGET) {
    text = text.slice(0, BUDGET_CHARS);
  }

  // Touch sessions dir so runtime exists even if empty
  void getSessionsDir();

  return {
    pointers,
    kgNeighborhoodSnippets,
    text,
    approxTokens: estimateTokens(text),
  };
}
