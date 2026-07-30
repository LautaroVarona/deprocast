/** Tamaño de chunk cliente → API (bajo el techo ~4.5 MB de Vercel). */
export const UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;

/** Single-shot legacy: rechazar en Vercel si supera este umbral. */
export const UPLOAD_SINGLE_SHOT_MAX_BYTES = Math.floor(3.5 * 1024 * 1024);

export const DISTILL_STATIONS = [
  "STT",
  "LINEAGE",
  "QUANT",
  "VECTORS",
  "HITL",
  "COAG",
] as const;

export type DistillStation = (typeof DISTILL_STATIONS)[number];

export type PipelineStation =
  | "QUEUED"
  | DistillStation
  | "ERROR";

export const DISTILL_GLYPHS: Record<DistillStation, string> = {
  STT: "[STT]",
  LINEAGE: "[LINEAGE]",
  QUANT: "[QUANT]",
  VECTORS: "[VECTORS]",
  HITL: "[HITL]",
  COAG: "[COAG]",
};
