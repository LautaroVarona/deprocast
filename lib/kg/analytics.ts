import { prisma } from "@/lib/prisma";
import { parseAliasesJson, parseMetadataJson } from "@/lib/kg/normalize";
import { CODE_NODE_TYPES, type KgNodeSummary } from "@/lib/kg/types";
import type { UniverseIdFilter } from "@/lib/babel/universe-refs";

type RawNode = {
  id: string;
  primaryName: string;
  type: string;
  aliases: unknown;
  metadata: unknown;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
};

function toSummary(node: RawNode): KgNodeSummary {
  return {
    id: node.id,
    primaryName: node.primaryName,
    type: node.type,
    aliases: parseAliasesJson(node.aliases),
    metadata: parseMetadataJson(node.metadata),
    confidence: node.confidence,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Personas vinculadas a un proyecto
// ---------------------------------------------------------------------------

const PEOPLE_PROJECT_RELATIONS = [
  "responsable_de",
  "participa_en",
  "trabaja_en",
  "colabora_con",
];

export async function getProjectPeople(
  projectNodeId: string,
): Promise<{ person: KgNodeSummary; relationType: string; context: string }[]> {
  const edges = await prisma.kgEdge.findMany({
    where: {
      targetNodeId: projectNodeId,
      relationType: { in: PEOPLE_PROJECT_RELATIONS },
    },
    include: { sourceNode: true },
  });

  return edges
    .filter((edge) => edge.sourceNode.type === "persona")
    .map((edge) => ({
      person: toSummary(edge.sourceNode),
      relationType: edge.relationType,
      context: edge.context,
    }));
}

// ---------------------------------------------------------------------------
// Proyectos relacionados entre si
// ---------------------------------------------------------------------------

export async function getRelatedProjects(
  projectNodeId: string,
  limit = 20,
): Promise<{ project: KgNodeSummary; sharedNeighbors: number }[]> {
  const edges = await prisma.kgEdge.findMany({
    where: {
      OR: [{ sourceNodeId: projectNodeId }, { targetNodeId: projectNodeId }],
    },
  });

  const neighborIds = new Set<string>();
  for (const edge of edges) {
    neighborIds.add(
      edge.sourceNodeId === projectNodeId ? edge.targetNodeId : edge.sourceNodeId,
    );
  }
  neighborIds.delete(projectNodeId);
  if (neighborIds.size === 0) return [];

  // Proyectos que comparten vecinos con el proyecto dado.
  const secondHop = await prisma.kgEdge.findMany({
    where: {
      OR: [
        { sourceNodeId: { in: [...neighborIds] } },
        { targetNodeId: { in: [...neighborIds] } },
      ],
    },
  });

  const counts = new Map<string, number>();
  for (const edge of secondHop) {
    for (const id of [edge.sourceNodeId, edge.targetNodeId]) {
      if (id === projectNodeId || neighborIds.has(id)) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  // Tambien relaciones directas relacionado_con entre proyectos.
  for (const edge of edges) {
    const other =
      edge.sourceNodeId === projectNodeId ? edge.targetNodeId : edge.sourceNodeId;
    counts.set(other, (counts.get(other) ?? 0) + 2);
  }

  const candidateIds = [...counts.keys()];
  if (candidateIds.length === 0) return [];

  const nodes = await prisma.kgNode.findMany({
    where: { id: { in: candidateIds }, type: "proyecto" },
  });

  return nodes
    .map((node) => ({
      project: toSummary(node),
      sharedNeighbors: counts.get(node.id) ?? 0,
    }))
    .sort((a, b) => b.sharedNeighbors - a.sharedNeighbors)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Ideas que aparecen repetidamente (por numero de menciones)
// ---------------------------------------------------------------------------

export async function getRepeatedIdeas(input: {
  limit?: number;
  types?: string[];
  nodeIds?: UniverseIdFilter;
} = {}): Promise<{ node: KgNodeSummary; mentionCount: number }[]> {
  const types = input.types ?? ["idea", "concepto"];

  if (input.nodeIds && input.nodeIds.size === 0) {
    return [];
  }

  const grouped = await prisma.kgMention.groupBy({
    by: ["nodeId"],
    where: input.nodeIds
      ? { nodeId: { in: [...input.nodeIds] } }
      : undefined,
    _count: { nodeId: true },
    orderBy: { _count: { nodeId: "desc" } },
    take: 500,
  });

  if (grouped.length === 0) return [];

  const nodes = await prisma.kgNode.findMany({
    where: {
      id: { in: grouped.map((g) => g.nodeId) },
      type: { in: types },
      reconocido: true,
    },
  });
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const result: { node: KgNodeSummary; mentionCount: number }[] = [];
  for (const g of grouped) {
    const node = nodeMap.get(g.nodeId);
    if (!node) continue;
    result.push({ node: toSummary(node), mentionCount: g._count.nodeId });
  }

  return result.slice(0, input.limit ?? 50);
}

// ---------------------------------------------------------------------------
// Dependencias de codigo
// ---------------------------------------------------------------------------

export async function getCodeDependencies(fileNodeId: string): Promise<{
  node: KgNodeSummary | null;
  imports: KgNodeSummary[];
  importedBy: KgNodeSummary[];
}> {
  const node = await prisma.kgNode.findUnique({ where: { id: fileNodeId } });

  const outgoing = await prisma.kgEdge.findMany({
    where: { sourceNodeId: fileNodeId, relationType: "importa" },
    include: { targetNode: true },
  });
  const incoming = await prisma.kgEdge.findMany({
    where: { targetNodeId: fileNodeId, relationType: "importa" },
    include: { sourceNode: true },
  });

  return {
    node: node ? toSummary(node) : null,
    imports: outgoing.map((e) => toSummary(e.targetNode)),
    importedBy: incoming.map((e) => toSummary(e.sourceNode)),
  };
}

// ---------------------------------------------------------------------------
// Centralidad (grado + peso)
// ---------------------------------------------------------------------------

export type CentralityEntry = {
  node: KgNodeSummary;
  degree: number;
  weightedDegree: number;
};

export async function getCentralityRanking(input: {
  limit?: number;
  type?: string;
  excludeCode?: boolean;
  nodeIds?: UniverseIdFilter;
} = {}): Promise<CentralityEntry[]> {
  if (input.nodeIds && input.nodeIds.size === 0) {
    return [];
  }

  const edges = await prisma.kgEdge.findMany({
    where: input.nodeIds
      ? {
          sourceNodeId: { in: [...input.nodeIds] },
          targetNodeId: { in: [...input.nodeIds] },
          sourceNode: { reconocido: true },
          targetNode: { reconocido: true },
        }
      : {
          sourceNode: { reconocido: true },
          targetNode: { reconocido: true },
        },
    select: { sourceNodeId: true, targetNodeId: true, weight: true },
  });

  const degree = new Map<string, number>();
  const weighted = new Map<string, number>();

  for (const edge of edges) {
    const w = edge.weight ?? 1;
    for (const id of [edge.sourceNodeId, edge.targetNodeId]) {
      degree.set(id, (degree.get(id) ?? 0) + 1);
      weighted.set(id, (weighted.get(id) ?? 0) + w);
    }
  }

  const ids = [...degree.keys()];
  if (ids.length === 0) return [];

  const codeTypes = CODE_NODE_TYPES as readonly string[];
  const nodes = await prisma.kgNode.findMany({
    where: {
      id: { in: ids },
      reconocido: true,
      ...(input.type ? { type: input.type } : {}),
      ...(input.excludeCode ? { type: { notIn: [...codeTypes] } } : {}),
    },
  });

  return nodes
    .map((node) => ({
      node: toSummary(node),
      degree: degree.get(node.id) ?? 0,
      weightedDegree: weighted.get(node.id) ?? 0,
    }))
    .sort((a, b) => b.weightedDegree - a.weightedDegree || b.degree - a.degree)
    .slice(0, input.limit ?? 50);
}

// ---------------------------------------------------------------------------
// Snapshot del grafo para visualizacion
// ---------------------------------------------------------------------------

export type GraphSnapshotNode = {
  id: string;
  primaryName: string;
  type: string;
  confidence: number;
  degree: number;
  aliasesCount: number;
  aliases: string[];
  isCenter?: boolean;
};

export type GraphSnapshotEdge = {
  id: string;
  source: string;
  target: string;
  relationType: string;
  context: string;
  weight: number | null;
  confidence: number;
};

export type GraphSnapshot = {
  nodes: GraphSnapshotNode[];
  edges: GraphSnapshotEdge[];
  centerNodeId: string | null;
};

export async function getGraphSnapshot(input: {
  types?: string[];
  excludeCode?: boolean;
  limit?: number;
  nodeIds?: UniverseIdFilter;
} = {}): Promise<GraphSnapshot> {
  if (input.nodeIds && input.nodeIds.size === 0) {
    return { nodes: [], edges: [], centerNodeId: null };
  }

  const { ensureOperatorPersonaNode } = await import("@/lib/yo/operator-node");
  const operatorNode = await ensureOperatorPersonaNode();
  const centerNodeId = operatorNode?.id ?? null;

  const codeTypes = CODE_NODE_TYPES as readonly string[];
  const typeFilter = input.types?.length
    ? { type: { in: input.types } }
    : input.excludeCode
      ? { type: { notIn: [...codeTypes] } }
      : {};

  const limit = input.limit ?? 1500;
  const nodes = await prisma.kgNode.findMany({
    where: {
      ...typeFilter,
      reconocido: true,
      ...(input.nodeIds ? { id: { in: [...input.nodeIds] } } : {}),
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  // El Operador siempre entra al snapshot, aunque el limit lo hubiera cortado.
  if (
    centerNodeId &&
    !nodes.some((node) => node.id === centerNodeId) &&
    (!input.nodeIds || input.nodeIds.has(centerNodeId)) &&
    (!input.types?.length || input.types.includes("persona"))
  ) {
    const hub = await prisma.kgNode.findUnique({ where: { id: centerNodeId } });
    if (hub && hub.reconocido) {
      nodes.unshift(hub);
      if (nodes.length > limit) nodes.pop();
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges = await prisma.kgEdge.findMany({
    where: input.nodeIds
      ? {
          sourceNodeId: { in: [...input.nodeIds] },
          targetNodeId: { in: [...input.nodeIds] },
        }
      : {
          sourceNodeId: { in: [...nodeIds] },
          targetNodeId: { in: [...nodeIds] },
        },
    take: 6000,
  });
  const filteredEdges = edges.filter(
    (e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId),
  );

  const degree = new Map<string, number>();
  for (const edge of filteredEdges) {
    degree.set(edge.sourceNodeId, (degree.get(edge.sourceNodeId) ?? 0) + 1);
    degree.set(edge.targetNodeId, (degree.get(edge.targetNodeId) ?? 0) + 1);
  }

  return {
    centerNodeId: nodeIds.has(centerNodeId ?? "") ? centerNodeId : null,
    nodes: nodes.map((node) => {
      const aliases = parseAliasesJson(node.aliases);
      return {
        id: node.id,
        primaryName: node.primaryName,
        type: node.type,
        confidence: node.confidence,
        degree: degree.get(node.id) ?? 0,
        aliasesCount: aliases.length,
        aliases,
        isCenter: node.id === centerNodeId,
      };
    }),
    edges: filteredEdges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      relationType: edge.relationType,
      context: edge.context,
      weight: edge.weight,
      confidence: edge.confidence,
    })),
  };
}

// ---------------------------------------------------------------------------
// Estadisticas globales
// ---------------------------------------------------------------------------

export type KgStats = {
  totalNodes: number;
  totalEdges: number;
  totalMentions: number;
  totalSources: number;
  nodesByType: { type: string; count: number }[];
  edgesByType: { relationType: string; count: number }[];
};

export async function getKgStats(input: {
  nodeIds?: UniverseIdFilter;
} = {}): Promise<KgStats> {
  if (input.nodeIds && input.nodeIds.size === 0) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      totalMentions: 0,
      totalSources: 0,
      nodesByType: [],
      edgesByType: [],
    };
  }

  const nodeIdList = input.nodeIds ? [...input.nodeIds] : undefined;

  const [
    totalNodes,
    totalEdges,
    totalMentions,
    totalSources,
    nodesByTypeRaw,
    edgesByTypeRaw,
  ] = await Promise.all([
    nodeIdList
      ? prisma.kgNode.count({
          where: { id: { in: nodeIdList }, reconocido: true },
        })
      : prisma.kgNode.count({ where: { reconocido: true } }),
    nodeIdList
      ? prisma.kgEdge.count({
          where: {
            sourceNodeId: { in: nodeIdList },
            targetNodeId: { in: nodeIdList },
          },
        })
      : prisma.kgEdge.count({
          where: {
            sourceNode: { reconocido: true },
            targetNode: { reconocido: true },
          },
        }),
    nodeIdList
      ? prisma.kgMention.count({
          where: {
            nodeId: { in: nodeIdList },
            node: { reconocido: true },
          },
        })
      : prisma.kgMention.count({ where: { node: { reconocido: true } } }),
    prisma.kgSource.count(),
    nodeIdList
      ? prisma.kgNode.groupBy({
          by: ["type"],
          where: { id: { in: nodeIdList }, reconocido: true },
          _count: { type: true },
        })
      : prisma.kgNode.groupBy({
          by: ["type"],
          where: { reconocido: true },
          _count: { type: true },
        }),
    nodeIdList
      ? prisma.kgEdge.groupBy({
          by: ["relationType"],
          where: {
            sourceNodeId: { in: nodeIdList },
            targetNodeId: { in: nodeIdList },
          },
          _count: { relationType: true },
        })
      : prisma.kgEdge.groupBy({
          by: ["relationType"],
          where: {
            sourceNode: { reconocido: true },
            targetNode: { reconocido: true },
          },
          _count: { relationType: true },
        }),
  ]);

  return {
    totalNodes,
    totalEdges,
    totalMentions,
    totalSources,
    nodesByType: nodesByTypeRaw
      .map((n) => ({ type: n.type, count: n._count.type }))
      .sort((a, b) => b.count - a.count),
    edgesByType: edgesByTypeRaw
      .map((e) => ({ relationType: e.relationType, count: e._count.relationType }))
      .sort((a, b) => b.count - a.count),
  };
}
