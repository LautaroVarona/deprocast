export type AudioPipelineStage =
  | "pending_stt"
  | "stt_queued"
  | "stt_processing"
  | "stt_error"
  | "purifying"
  | "pending_purify"
  | "in_validation"
  | "validated";

export type MetabolismPhase = "transcription" | "purification" | "validation";

export type AudioPipelineInfo = {
  stage: AudioPipelineStage;
  phase: MetabolismPhase;
  label: string;
  hint: string;
  reviewId?: string;
  needsAttention?: boolean;
};

type AssetLike = {
  id: string;
  status: string;
  transcript: { validated?: boolean } | null;
};

export function resolveAudioPipelineStage(
  asset: AssetLike,
  options: {
    queuedIds: Set<string>;
    activeId: string | null;
    purifyingIds?: Set<string>;
    reviewByAssetId: Map<string, string>;
  },
): AudioPipelineInfo {
  const { queuedIds, activeId, reviewByAssetId } = options;
  const purifyingIds = options.purifyingIds ?? new Set<string>();
  const reviewId = reviewByAssetId.get(asset.id);

  if (asset.transcript?.validated) {
    return {
      stage: "validated",
      phase: "validation",
      label: "Metabolizado",
      hint: "Validado en HITL. Chunks y grafo persistidos.",
      reviewId,
    };
  }

  if (reviewId) {
    return {
      stage: "in_validation",
      phase: "validation",
      label: "Validación (HITL)",
      hint: "Purificado. Revisá y aprobá en /validar.",
      reviewId,
    };
  }

  if (asset.transcript && purifyingIds.has(asset.id)) {
    return {
      stage: "purifying",
      phase: "purification",
      label: "Purificación",
      hint: "Pipeline de 6 estaciones en curso. Action items al final.",
    };
  }

  if (asset.transcript) {
    return {
      stage: "pending_purify",
      phase: "purification",
      label: "Atención requerida",
      hint: "Transcripción lista. Reintentá la purificación.",
      needsAttention: true,
    };
  }

  if (asset.id === activeId || asset.status === "PROCESSING") {
    return {
      stage: "stt_processing",
      phase: "transcription",
      label: "Transcripción",
      hint: "Deepgram transcribiendo en tiempo real.",
    };
  }

  if (
    (asset.status === "PENDING" || asset.status === "ERROR") &&
    queuedIds.has(asset.id)
  ) {
    return {
      stage: "stt_queued",
      phase: "transcription",
      label: "Transcripción",
      hint: "En cola. Arranca automáticamente.",
    };
  }

  if (asset.status === "ERROR") {
    return {
      stage: "stt_error",
      phase: "transcription",
      label: "Atención requerida",
      hint: "Falló la transcripción. Podés reintentar.",
      needsAttention: true,
    };
  }

  return {
    stage: "pending_stt",
    phase: "transcription",
    label: "Transcripción",
    hint: "Metabolización iniciada. Esperando turno.",
  };
}

export const METABOLISM_PHASES: Array<{
  id: MetabolismPhase;
  label: string;
}> = [
  { id: "transcription", label: "Transcripción" },
  { id: "purification", label: "Purificación" },
  { id: "validation", label: "Validación" },
];

export function resolvePhaseProgress(
  pipeline: AudioPipelineInfo,
): Record<MetabolismPhase, "pending" | "active" | "done" | "attention"> {
  const progress: Record<
    MetabolismPhase,
    "pending" | "active" | "done" | "attention"
  > = {
    transcription: "pending",
    purification: "pending",
    validation: "pending",
  };

  if (pipeline.needsAttention) {
    progress[pipeline.phase] = "attention";
    if (pipeline.phase === "purification") {
      progress.transcription = "done";
    }
    return progress;
  }

  switch (pipeline.stage) {
    case "validated":
      progress.transcription = "done";
      progress.purification = "done";
      progress.validation = "done";
      break;
    case "in_validation":
      progress.transcription = "done";
      progress.purification = "done";
      progress.validation = "active";
      break;
    case "purifying":
    case "pending_purify":
      progress.transcription = "done";
      progress.purification =
        pipeline.stage === "purifying" ? "active" : "attention";
      break;
    case "stt_processing":
    case "stt_queued":
    case "pending_stt":
      progress.transcription = "active";
      break;
    case "stt_error":
      progress.transcription = "attention";
      break;
    default:
      break;
  }

  return progress;
}
