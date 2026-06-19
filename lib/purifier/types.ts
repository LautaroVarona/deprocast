import type { SourceType } from "@/lib/document-constants";
import type { IngestResult, LlmKgExtraction } from "@/lib/kg/types";
import type { CampoSlug } from "@/lib/projects/campos";

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
  particula: string;
  assetId?: string;
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
  metaTagsSecundarios: string[];
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
};

export type PurifierInput = {
  rawText: string;
  assetId?: string;
  filename?: string;
  metadata?: Record<string, string | null>;
  gravity?: GravityInput;
};
