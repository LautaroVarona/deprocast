import type { NodeType, RelationType } from "@/lib/kg/types";

/** Nodo estructural propuesto por el Mapeador (pre-HITL). */
export type StructuralNodeProposal = {
  /** Id local estable para toggles HITL en el cliente. */
  localId: string;
  name: string;
  type: NodeType;
  confidence?: number;
};

/** Arista estructural propuesta (pre-HITL). */
export type StructuralEdgeProposal = {
  localId: string;
  fromName: string;
  toName: string;
  relationType: RelationType;
  context: string;
};

/**
 * Payload combinado del Atanor Visual.
 * Nunca se persiste hasta que el operador pulse COAGULAR.
 */
export type HermeneutaExtractResult = {
  semanticText: string;
  structuralNodes: StructuralNodeProposal[];
  structuralEdges: StructuralEdgeProposal[];
  mimeType: string;
  originalFilename: string;
  modelUsed?: string;
};

/** Payload HITL validado para coagulación en Prisma. */
export type HermeneutaCoagulateInput = {
  semanticText: string;
  nodes: Array<{
    name: string;
    type: NodeType;
  }>;
  edges: Array<{
    fromName: string;
    toName: string;
    relationType: RelationType;
    context: string;
  }>;
  title?: string;
  originalFilename?: string;
};

export type HermeneutaCoagulateResult = {
  documentPath: string;
  sourceId: string;
  nodeIds: string[];
  edgeIds: string[];
  skipped: boolean;
};

export type HermeneutaPhase =
  | "idle"
  | "calentando"
  | "extrayendo"
  | "espejo"
  | "coagulando"
  | "coagulado"
  | "error";
