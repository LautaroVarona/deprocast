import type { AreasRelevancia, MetaArea } from "@/lib/meta-meteador/types";

export type DocumentFormat = "audio" | "word" | "texto" | "documento";

export type SemanticBiasEntry = {
  area: MetaArea;
  score: number;
  porcentaje: number;
};

export type CortexNode = {
  id: string;
  titulo: string;
  formato: DocumentFormat;
  materia: string;
  particula: string;
  campo: string;
  areas: AreasRelevancia;
  processedAt: string;
  campoSlug: string | null;
  projectTitle: string | null;
};

export type CortexSnapshot = {
  totalNodesIndexed: number;
  validatedDocuments: number;
  dominantAreaThisWeek: MetaArea | null;
  semanticBias: SemanticBiasEntry[];
  nodes: CortexNode[];
};
