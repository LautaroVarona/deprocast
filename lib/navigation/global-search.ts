import "server-only";

import { searchArchivo } from "@/lib/archivo";
import type { ArchivoKind } from "@/lib/archivo/types";
import { hybridSearch } from "@/lib/chat/hybrid-search";
import { searchNodes } from "@/lib/kg/queries";
import {
  badgeForArchivoKind,
  resolveArchivoHref,
  resolveHybridHitHref,
  resolveKgNodeHref,
} from "@/lib/navigation/resolve-href";

export type GlobalSearchResultKind =
  | "semantic"
  | "archivo"
  | "kg_node";

export type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  kind: GlobalSearchResultKind;
  badge: string;
};

function dedupeKey(result: GlobalSearchResult): string {
  return `${result.kind}::${result.href}::${result.title}`;
}

function mergeResults(results: GlobalSearchResult[]): GlobalSearchResult[] {
  const map = new Map<string, GlobalSearchResult>();

  for (const result of results) {
    const key = dedupeKey(result);
    const existing = map.get(key);
    if (!existing || result.score > existing.score) {
      map.set(key, result);
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

export async function globalSearch(input: {
  query: string;
  limit?: number;
}): Promise<GlobalSearchResult[]> {
  const query = input.query.trim();
  if (!query) return [];

  const limit = input.limit ?? 12;

  const [hybridHits, archivoHits, kgNodes] = await Promise.all([
    hybridSearch({ query, limit: 10 }),
    searchArchivo(query, { limit: 8 }),
    searchNodes({ q: query, limit: 8 }),
  ]);

  const results: GlobalSearchResult[] = [];

  for (const hit of hybridHits) {
    results.push({
      id: `semantic:${hit.source}:${hit.title}`,
      title: hit.title,
      subtitle: hit.body.slice(0, 160),
      href: resolveHybridHitHref(hit),
      score: hit.score * 1.1,
      kind: "semantic",
      badge: "Memoria",
    });
  }

  for (const hit of archivoHits) {
    results.push({
      id: `archivo:${hit.id}`,
      title: hit.title,
      subtitle: hit.snippet || hit.preview,
      href: resolveArchivoHref({
        kind: hit.kind,
        sourceId: hit.sourceId,
        meta: hit.meta,
      }),
      score: hit.score,
      kind: "archivo",
      badge: badgeForArchivoKind(hit.kind as ArchivoKind),
    });
  }

  for (const node of kgNodes) {
    const fuzzyBoost = 8;
    results.push({
      id: `kg:${node.id}`,
      title: node.primaryName,
      subtitle: node.aliases.length
        ? `Alias: ${node.aliases.slice(0, 3).join(", ")}`
        : `Nodo ${node.type}`,
      href: resolveKgNodeHref(node),
      score: fuzzyBoost,
      kind: "kg_node",
      badge: node.type,
    });
  }

  return mergeResults(results).slice(0, limit);
}
