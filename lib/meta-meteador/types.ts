export const META_AREAS = [
  "Salud",
  "Legal",
  "Finanzas",
  "Tecnologia",
  "Arte",
  "Comunidad",
] as const;

export type MetaArea = (typeof META_AREAS)[number];

export type AreaRelevance = {
  score_1_12: number;
  porcentaje: number;
};

export type AreasRelevancia = Record<MetaArea, AreaRelevance>;

export type MetadataDelTodo = {
  materia: string;
  particula: string;
  campo: string;
  onda: string;
  tiempo_espacio: string;
  posicion: string;
};

export type MetaMeteadorOutput = {
  id_documento: string;
  titulo: string;
  metadata_del_todo: MetadataDelTodo;
  areas_relevancia: AreasRelevancia;
};

export type MetaMeteadorRunResult = {
  procesados: number;
  retitulados: number;
  saltados: number;
  errores: Array<{ documentId: string; error: string }>;
};

export type MetaMeteadorCoverage = {
  totalDocuments: number;
  withMeta: number;
  pending: number;
};

export type MetaMeteadorProcessTrace = {
  userPrompt: string;
  rawResponse: string;
  modelUsed: string;
  tituloEsManual: boolean;
};

export type MetaMeteadorSessionItem = {
  documentId: string;
  oldFilename: string;
  oldTitle: string;
  proposedTitle: string;
  tituloLocked: boolean;
  canRename: boolean;
  titleApplied: boolean;
  metadata: MetadataDelTodo;
  areas: AreasRelevancia;
  processTrace: MetaMeteadorProcessTrace;
};

export type MetaMeteadorStreamEvent =
  | { type: "start"; pending: number; skipped: number; total: number }
  | {
      type: "processing";
      documentId: string;
      oldFilename: string;
      oldTitle: string;
    }
  | { type: "result"; item: MetaMeteadorSessionItem }
  | {
      type: "error";
      documentId: string;
      oldFilename: string;
      error: string;
    }
  | { type: "done"; summary: MetaMeteadorRunResult };

export type MetaMeteadorAcceptInput = {
  items: Array<{ documentId: string; title?: string }>;
};

export type MetaMeteadorAcceptResult = {
  applied: number;
  errors: Array<{ documentId: string; error: string }>;
};

export function computePorcentaje(score: number): number {
  const clamped = Math.min(12, Math.max(1, Math.round(score)));
  return Math.round((clamped / 12) * 1000) / 10;
}

export function normalizeAreasRelevancia(
  raw: Partial<Record<string, { score_1_12?: number; porcentaje?: number }>>,
): AreasRelevancia {
  const result = {} as AreasRelevancia;
  for (const area of META_AREAS) {
    const entry = raw[area];
    const score = Math.min(12, Math.max(1, Math.round(Number(entry?.score_1_12) || 1)));
    result[area] = {
      score_1_12: score,
      porcentaje: computePorcentaje(score),
    };
  }
  return result;
}
