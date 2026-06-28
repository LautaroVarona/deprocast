/** Nota cronológica extraída de una grabación de pantalla. */
export type ConsciousnessNote = {
  id: string;
  /** Formato mm:ss relativo al inicio del video. */
  timestamp: string;
  timestampSeconds: number;
  /** Aplicación o superficie visual dominante en ese instante. */
  appActiva: string;
  /** Descripción exhaustiva de la acción observada. */
  descripcionDetallada: string;
  /** Escala 1–12: 12 = foco absoluto en Tech/acción, 1 = dispersión total. */
  nivelDeFoco: number;
};

export type WatcherPhase =
  | "idle"
  | "loaded"
  | "analyzing"
  | "complete"
  | "injecting"
  | "injected"
  | "error";

export type WatcherSession = {
  id: string;
  videoFilename: string;
  videoDurationSeconds: number;
  notas: ConsciousnessNote[];
  analyzedAt: string;
  injectedAt?: string;
};

export type AnalyzeInput = {
  filename: string;
  durationSeconds: number;
  fileSizeBytes?: number;
};

export type AnalyzeResult = {
  sessionId: string;
  notas: ConsciousnessNote[];
  duracionMs: number;
};

export type InjectInput = {
  sessionId: string;
  videoFilename: string;
  videoDurationSeconds: number;
  notas: ConsciousnessNote[];
};

export type InjectResult = {
  sessionId: string;
  notasInyectadas: number;
  particulasGeneradas: number;
  textoConsolidado: string;
  injectedAt: string;
};

export type WatcherPipelineState = {
  phase: WatcherPhase;
  videoFile: File | null;
  videoUrl: string | null;
  videoDurationSeconds: number;
  sessionId: string | null;
  notas: ConsciousnessNote[];
  error: string | null;
  injectedAt: string | null;
};
