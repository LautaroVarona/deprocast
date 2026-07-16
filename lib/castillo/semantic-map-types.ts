export type SemanticMapNodeKind = "yo" | "persona" | "proyecto" | "cuaderno";

export type SemanticMapNode = {
  id: string;
  label: string;
  kind: SemanticMapNodeKind;
  deepLink: string | null;
  degree: number;
  subtitle?: string | null;
};

export type SemanticMapEdge = {
  id: string;
  source: string;
  target: string;
  relationType: string;
  synthetic?: boolean;
};

export type SemanticMapSnapshot = {
  nodes: SemanticMapNode[];
  edges: SemanticMapEdge[];
  universe: string | null;
};
