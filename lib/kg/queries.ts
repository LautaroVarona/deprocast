import {
  levenshteinRatio,
  namesMatchFuzzy,
  normalizeName,
  parseAliasesJson,
  parseMetadataJson,
} from "@/lib/kg/normalize";
import type { KgNodeSummary } from "@/lib/kg/types";
import { prisma } from "@/lib/prisma";

function toNodeSummary(node: {
  id: string;
  primaryName: string;
  type: string;
  aliases: unknown;
  metadata: unknown;
  confidence?: number;
  createdAt: Date;
  updatedAt: Date;
}): KgNodeSummary {
  return {
    id: node.id,
    primaryName: node.primaryName,
    type: node.type,
    aliases: parseAliasesJson(node.aliases),
    metadata: parseMetadataJson(node.metadata),
    confidence: typeof node.confidence === "number" ? node.confidence : 0.6,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}

export type SearchNodesInput = {
  type?: string;
  q?: string;
  campoSlug?: string;
  limit?: number;
};

export async function searchNodes(input: SearchNodesInput = {}): Promise<KgNodeSummary[]> {
  const limit = input.limit ?? 50;
  const nodes = await prisma.kgNode.findMany({
    where: input.type ? { type: input.type } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  let filtered = nodes;

  if (input.q?.trim()) {
    const query = input.q.trim();
    filtered = filtered.filter(
      (node) =>
        namesMatchFuzzy(node.primaryName, query) ||
        parseAliasesJson(node.aliases).some((alias) => namesMatchFuzzy(alias, query)),
    );
  }

  if (input.campoSlug?.trim()) {
    const slug = input.campoSlug.trim();
    filtered = filtered.filter((node) => {
      const metadata = parseMetadataJson(node.metadata);
      return metadata.campoSlug === slug;
    });
  }

  return filtered.slice(0, limit).map(toNodeSummary);
}

export async function getNodeById(id: string): Promise<KgNodeSummary | null> {
  const node = await prisma.kgNode.findUnique({ where: { id } });
  return node ? toNodeSummary(node) : null;
}

export type NeighborhoodEdge = {
  id: string;
  relationType: string;
  context: string;
  weight: number | null;
  direction: "outgoing" | "incoming";
  neighbor: KgNodeSummary;
};

export type NeighborhoodResult = {
  node: KgNodeSummary;
  edges: NeighborhoodEdge[];
  mentions: {
    id: string;
    sourceType: string;
    sourceId: string;
    fragment: string;
    createdAt: string;
  }[];
};

export async function getNeighborhood(nodeId: string): Promise<NeighborhoodResult | null> {
  const node = await prisma.kgNode.findUnique({
    where: { id: nodeId },
    include: {
      outgoingEdges: { include: { targetNode: true } },
      incomingEdges: { include: { sourceNode: true } },
      mentions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!node) return null;

  const edges: NeighborhoodEdge[] = [
    ...node.outgoingEdges.map((edge) => ({
      id: edge.id,
      relationType: edge.relationType,
      context: edge.context,
      weight: edge.weight,
      direction: "outgoing" as const,
      neighbor: toNodeSummary(edge.targetNode),
    })),
    ...node.incomingEdges.map((edge) => ({
      id: edge.id,
      relationType: edge.relationType,
      context: edge.context,
      weight: edge.weight,
      direction: "incoming" as const,
      neighbor: toNodeSummary(edge.sourceNode),
    })),
  ];

  return {
    node: toNodeSummary(node),
    edges,
    mentions: node.mentions.map((mention) => ({
      id: mention.id,
      sourceType: mention.sourceType,
      sourceId: mention.sourceId,
      fragment: mention.fragment,
      createdAt: mention.createdAt.toISOString(),
    })),
  };
}

export type DuplicateCandidate = {
  type: string;
  a: KgNodeSummary;
  b: KgNodeSummary;
  similarity: number;
  reason: "alias" | "fuzzy" | "contains";
};

/**
 * Detecta pares de nodos del mismo tipo que probablemente sean la misma
 * entidad (alias compartido, inclusion de nombre o similitud fuzzy alta).
 */
export async function getDuplicateCandidates(input: {
  type?: string;
  limit?: number;
} = {}): Promise<DuplicateCandidate[]> {
  const nodes = await prisma.kgNode.findMany({
    where: input.type ? { type: input.type } : undefined,
    take: 2000,
  });

  const byType = new Map<string, typeof nodes>();
  for (const node of nodes) {
    const list = byType.get(node.type) ?? [];
    list.push(node);
    byType.set(node.type, list);
  }

  const candidates: DuplicateCandidate[] = [];

  for (const list of byType.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];

        const aNames = [a.primaryName, ...parseAliasesJson(a.aliases)];
        const bNames = [b.primaryName, ...parseAliasesJson(b.aliases)];

        const aNorm = new Set(aNames.map(normalizeName));
        const sharedAlias = bNames.some((name) => aNorm.has(normalizeName(name)));

        const na = normalizeName(a.primaryName);
        const nb = normalizeName(b.primaryName);
        const contains = na && nb && (na.includes(nb) || nb.includes(na));

        const fuzzy = namesMatchFuzzy(a.primaryName, b.primaryName);

        if (sharedAlias || contains || fuzzy) {
          candidates.push({
            type: a.type,
            a: toNodeSummary(a),
            b: toNodeSummary(b),
            similarity: levenshteinRatio(na, nb),
            reason: sharedAlias ? "alias" : contains ? "contains" : "fuzzy",
          });
        }
      }
    }
  }

  candidates.sort((x, y) => y.similarity - x.similarity);
  return candidates.slice(0, input.limit ?? 100);
}

export async function getMentionsForSource(
  sourceType: string,
  sourceId: string,
): Promise<
  {
    id: string;
    fragment: string;
    node: KgNodeSummary;
  }[]
> {
  const mentions = await prisma.kgMention.findMany({
    where: { sourceType, sourceId },
    include: { node: true },
    orderBy: { createdAt: "desc" },
  });

  return mentions.map((mention) => ({
    id: mention.id,
    fragment: mention.fragment,
    node: toNodeSummary(mention.node),
  }));
}
