import { namesMatchFuzzy, normalizeName } from "@/lib/kg/normalize";

export type GraphSearchNode = {
  id: string;
  primaryName: string;
  type: string;
  degree: number;
  aliases?: string[];
};

export type GraphSearchEdge = {
  source: string;
  target: string;
  relationType: string;
};

export type GraphSearchSnapshot = {
  nodes: GraphSearchNode[];
  edges: GraphSearchEdge[];
};

export type GraphSearchMatch = {
  id: string;
  primaryName: string;
  type: string;
  score: number;
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

function scoreNode(
  node: GraphSearchNode,
  query: string,
  tokens: string[],
  edgeTerms: string[],
): number {
  let score = scoreText(node.primaryName, query, tokens);
  score += scoreText(node.type, query, tokens) * 0.6;

  for (const alias of node.aliases ?? []) {
    score += scoreText(alias, query, tokens) * 0.9;
  }

  for (const term of edgeTerms) {
    score += scoreText(term, query, tokens) * 0.5;
  }

  return score;
}

function buildEdgeTermsByNode(edges: GraphSearchEdge[]): Map<string, string[]> {
  const terms = new Map<string, string[]>();

  const push = (nodeId: string, value: string) => {
    const list = terms.get(nodeId) ?? [];
    list.push(value);
    terms.set(nodeId, list);
  };

  for (const edge of edges) {
    push(edge.source, edge.relationType);
    push(edge.target, edge.relationType);
  }

  return terms;
}

export function searchGraphSnapshot<
  TNode extends GraphSearchNode,
  TEdge extends GraphSearchEdge,
>(
  snapshot: { nodes: TNode[]; edges: TEdge[] },
  query: string,
  options: { includeNeighbors?: boolean; limit?: number } = {},
): {
  snapshot: { nodes: TNode[]; edges: TEdge[] };
  matches: GraphSearchMatch[];
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return { snapshot, matches: [] };
  }

  const tokens = tokenize(trimmed);
  const edgeTermsByNode = buildEdgeTermsByNode(snapshot.edges);
  const scored = snapshot.nodes
    .map((node) => ({
      node,
      score: scoreNode(
        node,
        trimmed,
        tokens,
        edgeTermsByNode.get(node.id) ?? [],
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.node.degree - a.node.degree);

  const matchLimit = options.limit ?? 12;
  const matches: GraphSearchMatch[] = scored.slice(0, matchLimit).map((item) => ({
    id: item.node.id,
    primaryName: item.node.primaryName,
    type: item.node.type,
    score: item.score,
  }));

  const visibleIds = new Set(scored.map((item) => item.node.id));

  if (options.includeNeighbors !== false) {
    for (const edge of snapshot.edges) {
      const sourceVisible = visibleIds.has(edge.source);
      const targetVisible = visibleIds.has(edge.target);
      if (sourceVisible) visibleIds.add(edge.target);
      if (targetVisible) visibleIds.add(edge.source);
    }
  }

  const nodes = snapshot.nodes.filter((node) => visibleIds.has(node.id));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = snapshot.edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );

  return { snapshot: { nodes, edges }, matches };
}
