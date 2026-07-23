import type { SourceType } from "@/lib/document-constants";
import type { IngestResult, LlmKgExtraction } from "@/lib/kg/types";
import type { CampoSlug } from "@/lib/projects/campos";
import type { PipelineStatus } from "@/lib/purifier/pipeline-status";
import type { StrictMetaTags } from "@/lib/purifier/meta-tags-taxonomy";

export const DUDA_MARKER_REGEX = /==DUDA:\s*(.+?)==/gs;

export type SevenDimensions = {
  materia: string;
  particula: string;
  posicion: string;
  onda: string;
  tiempo: string;
  espacio: string;
  field: string;
};

export type GravityInput = {
  title?: string;
  campoSlug?: CampoSlug;
  universeSlug?: string;
  onda?: string;
  sourceType?: SourceType;
  prioridad?: number;
  impacto?: number;
  dificultad?: number;
};

export type FractalChild = {
  index: number;
  lines: string[];
  content: string;
};

export type FractalParent = {
  index: number;
  context: string;
  children: FractalChild[];
};

export type PurifierStageSnapshot = {
  station: number;
  name: string;
  input?: string;
  output: string;
  meta?: Record<string, unknown>;
  error?: string;
};

export type PurifierReviewRecord = {
  schemaVersion: "2";
  reviewId: string;
  /** Estado canónico del pipeline de ingesta. */
  pipelineStatus: PipelineStatus;
  particula: string;
  assetId?: string;
  captureId?: string;
  gravity: Required<Pick<GravityInput, "campoSlug">> &
    GravityInput & {
      prioridad: number;
      impacto: number;
      dificultad: number;
    };
  source: {
    filename: string;
    metadata: Record<string, string | null>;
  };
  originalText: string;
  stages: PurifierStageSnapshot[];
  afterRegex: string;
  cleanedText: string;
  /** Siempre exactamente 6 etiquetas en orden de taxonomía. */
  metaTagsSecundarios: string[];
  /** Forma estructurada de las 6 etiquetas (fuente de verdad preferida). */
  strictMetaTags?: StrictMetaTags;
  doubts: string[];
  suggestedDimensions: SevenDimensions & {
    title: string;
    prioridad: number;
    impacto: number;
    dificultad: number;
  };
  normalizedMarkdown: string;
  fractalSegments: FractalParent[];
  dedup: {
    mergedCount: number;
    threshold: number;
  };
  regex: { removedCount: number };
  processedAt: string;
  model: string;
  kgExtraction?: LlmKgExtraction;
  kgIngest?: IngestResult;
  purificationError?: string;
};

export type PurifierInput = {
  rawText: string;
  assetId?: string;
  filename?: string;
  metadata?: Record<string, string | null>;
  gravity?: GravityInput;
};
