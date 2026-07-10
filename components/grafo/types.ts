export type SnapshotNode = {
  id: string;
  primaryName: string;
  type: string;
  confidence: number;
  degree: number;
  aliasesCount: number;
  aliases?: string[];
};

export type SnapshotEdge = {
  id: string;
  source: string;
  target: string;
  relationType: string;
  context: string;
  weight: number | null;
  confidence: number;
};

export type GraphSnapshot = {
  nodes: SnapshotNode[];
  edges: SnapshotEdge[];
};

export type NodeSummary = {
  id: string;
  primaryName: string;
  type: string;
  aliases: string[];
  metadata: Record<string, unknown>;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type NeighborhoodEdge = {
  id: string;
  relationType: string;
  context: string;
  weight: number | null;
  direction: "outgoing" | "incoming" | "self";
  neighbor: NodeSummary;
};

export type NeighborhoodResult = {
  node: NodeSummary;
  edges: NeighborhoodEdge[];
  mentions: {
    id: string;
    sourceType: string;
    sourceId: string;
    fragment: string;
    createdAt: string;
  }[];
};

export type KgStats = {
  totalNodes: number;
  totalEdges: number;
  totalMentions: number;
  totalSources: number;
  nodesByType: { type: string; count: number }[];
  edgesByType: { relationType: string; count: number }[];
};

export type CentralityEntry = {
  node: NodeSummary;
  degree: number;
  weightedDegree: number;
};

export type RepeatedIdea = {
  node: NodeSummary;
  mentionCount: number;
};

export type StatsResponse = {
  stats: KgStats;
  centrality: CentralityEntry[];
  repeatedIdeas: RepeatedIdea[];
};

export type DuplicateCandidate = {
  type: string;
  a: NodeSummary;
  b: NodeSummary;
  similarity: number;
  reason: "alias" | "fuzzy" | "contains";
};

export const TYPE_COLORS: Record<string, string> = {
  persona: "#10b981",
  organizacion: "#f97316",
  proyecto: "#8b5cf6",
  idea: "#f59e0b",
  concepto: "#eab308",
  documento: "#0ea5e9",
  archivo: "#64748b",
  modulo: "#3f3f46",
  lugar: "#f43f5e",
  tecnologia: "#06b6d4",
  ley: "#a855f7",
  proceso: "#14b8a6",
  area: "#ec4899",
};

export function colorForType(type: string): string {
  return TYPE_COLORS[type] ?? "#9ca3af";
}
