export type AudioPipelineStage =
  | "pending_stt"
  | "stt_queued"
  | "stt_processing"
  | "stt_error"
  | "pending_purify"
  | "in_validation"
  | "validated";

export type AudioPipelineInfo = {
  stage: AudioPipelineStage;
  label: string;
  hint: string;
  reviewId?: string;
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
    reviewByAssetId: Map<string, string>;
  },
): AudioPipelineInfo {
  const { queuedIds, activeId, reviewByAssetId } = options;
  const reviewId = reviewByAssetId.get(asset.id);

  if (asset.transcript?.validated) {
    return {
      stage: "validated",
      label: "Validado",
      hint: "Aprobado en Validar; chunks semánticos persistidos.",
      reviewId,
    };
  }

  if (reviewId) {
    return {
      stage: "in_validation",
      label: "En Validar",
      hint: "Purificado. Revisá y aprobá en /validar.",
      reviewId,
    };
  }

  if (asset.transcript) {
    return {
      stage: "pending_purify",
      label: "Transcrito",
      hint: "STT listo. Falta enviar a purificación / Validar.",
    };
  }

  if (asset.id === activeId || asset.status === "PROCESSING") {
    return {
      stage: "stt_processing",
      label: "Transcribiendo",
      hint: "Chirp_2 en curso.",
    };
  }

  if (
    (asset.status === "PENDING" || asset.status === "ERROR") &&
    queuedIds.has(asset.id)
  ) {
    return {
      stage: "stt_queued",
      label: "En cola STT",
      hint: "Esperando turno de transcripción.",
    };
  }

  if (asset.status === "ERROR") {
    return {
      stage: "stt_error",
      label: "Error STT",
      hint: "Reintentá el procesamiento.",
    };
  }

  return {
    stage: "pending_stt",
    label: "Pendiente STT",
    hint: "Subido; falta transcribir.",
  };
}
