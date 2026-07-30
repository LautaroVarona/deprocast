import type {
  DistillStation,
  PipelineStation,
} from "@/lib/audio-upload/constants";
import { DISTILL_STATIONS } from "@/lib/audio-upload/constants";

export type DistillStepState = "idle" | "active" | "done" | "error";

export type DistillStepperState = {
  station: PipelineStation;
  steps: Record<DistillStation, DistillStepState>;
  errorCode?: string;
  errorLabel?: string;
};

export type AudioPipelineStage =
  | "pending_stt"
  | "stt_queued"
  | "stt_processing"
  | "stt_error"
  | "lineage"
  | "quant"
  | "vectors"
  | "purifying"
  | "pending_purify"
  | "in_validation"
  | "validated"
  | "coagulated";

export type MetabolismPhase =
  | "transcription"
  | "lineage"
  | "quant"
  | "vectors"
  | "validation"
  | "coagulation";

export type AudioPipelineInfo = {
  stage: AudioPipelineStage;
  phase: MetabolismPhase;
  label: string;
  hint: string;
  reviewId?: string;
  needsAttention?: boolean;
  pipelineStation?: PipelineStation;
  pipelineError?: string | null;
  distill: DistillStepperState;
};

type AssetLike = {
  id: string;
  status: string;
  pipelineStation?: string | null;
  pipelineError?: string | null;
  transcript: { validated?: boolean } | null;
};

function asPipelineStation(value: string | null | undefined): PipelineStation {
  const normalized = (value ?? "QUEUED").toUpperCase();
  if (
    normalized === "QUEUED" ||
    normalized === "ERROR" ||
    (DISTILL_STATIONS as readonly string[]).includes(normalized)
  ) {
    return normalized as PipelineStation;
  }
  return "QUEUED";
}

export function buildDistillStepper(input: {
  pipelineStation?: string | null;
  pipelineError?: string | null;
  status?: string;
  validated?: boolean;
}): DistillStepperState {
  const station = asPipelineStation(input.pipelineStation);
  const steps = Object.fromEntries(
    DISTILL_STATIONS.map((s) => [s, "idle" as DistillStepState]),
  ) as Record<DistillStation, DistillStepState>;

  if (station === "ERROR" || input.status === "ERROR") {
    const err = input.pipelineError?.trim() || "ERROR";
    const codeMatch = /\b413\b/.exec(err);
    const failedStep: DistillStation =
      /LINEAGE/i.test(err)
        ? "LINEAGE"
        : /QUANT/i.test(err)
          ? "QUANT"
          : /VECTOR/i.test(err)
            ? "VECTORS"
            : /HITL|PURIF/i.test(err)
              ? "HITL"
              : "STT";
    const stepsWithError = { ...steps } as Record<DistillStation, DistillStepState>;
    const order: DistillStation[] = ["STT", "LINEAGE", "QUANT", "VECTORS", "HITL"];
    const failIdx = order.indexOf(failedStep);
    for (let i = 0; i < order.length; i += 1) {
      const s = order[i]!;
      if (i < failIdx) stepsWithError[s] = "done";
      else if (i === failIdx) stepsWithError[s] = "error";
      else stepsWithError[s] = "idle";
    }
    return {
      station: "ERROR",
      steps: stepsWithError,
      errorCode: codeMatch ? "413" : undefined,
      errorLabel: codeMatch
        ? "[ERR: 413]"
        : `[ERR: ${err.slice(0, 48)}]`,
    };
  }

  if (station === "COAG" || input.validated) {
    for (const s of DISTILL_STATIONS) {
      steps[s] = "done";
    }
    return { station: "COAG", steps };
  }

  const order: PipelineStation[] = [
    "QUEUED",
    "STT",
    "LINEAGE",
    "QUANT",
    "VECTORS",
    "HITL",
    "COAG",
  ];
  const idx = order.indexOf(station);

  for (let i = 0; i < DISTILL_STATIONS.length; i += 1) {
    const s = DISTILL_STATIONS[i]!;
    const stationIdx = order.indexOf(s);
    if (idx < 0) {
      steps[s] = "idle";
    } else if (stationIdx < idx) {
      steps[s] = "done";
    } else if (stationIdx === idx) {
      steps[s] = "active";
    } else {
      steps[s] = "idle";
    }
  }

  // QUEUED → STT activo visualmente
  if (station === "QUEUED") {
    steps.STT = "active";
  }

  return { station, steps };
}

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
  const pipelineStation = asPipelineStation(asset.pipelineStation);
  const distill = buildDistillStepper({
    pipelineStation: asset.pipelineStation,
    pipelineError: asset.pipelineError,
    status: asset.status,
    validated: asset.transcript?.validated,
  });

  if (pipelineStation === "COAG" || asset.transcript?.validated) {
    return {
      stage: "coagulated",
      phase: "coagulation",
      label: "Coagulado",
      hint: "Sellado en el grafo (reconocido: true).",
      reviewId,
      pipelineStation: "COAG",
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  if (pipelineStation === "HITL" || reviewId) {
    return {
      stage: "in_validation",
      phase: "validation",
      label: "HITL",
      hint: "Calibrá Escala Hermética (1–12) y reconocé en /validar.",
      reviewId,
      pipelineStation: "HITL",
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  if (pipelineStation === "VECTORS") {
    return {
      stage: "vectors",
      phase: "vectors",
      label: "Vectores",
      hint: "Acción · Entidades · Semántica.",
      pipelineStation,
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  if (pipelineStation === "QUANT") {
    return {
      stage: "quant",
      phase: "quant",
      label: "Quantador",
      hint: "Fragmentando Quántomos.",
      pipelineStation,
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  if (pipelineStation === "LINEAGE") {
    return {
      stage: "lineage",
      phase: "lineage",
      label: "Linaje",
      hint: "OriginAttribution + contexto ambiental.",
      pipelineStation,
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  if (asset.transcript && purifyingIds.has(asset.id)) {
    return {
      stage: "purifying",
      phase: "lineage",
      label: "Destilación",
      hint: "Pipeline molecular en curso.",
      pipelineStation,
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  if (asset.transcript && pipelineStation === "STT") {
    return {
      stage: "pending_purify",
      phase: "lineage",
      label: "Post-STT",
      hint: "Transcripción lista. Avanzando destilación.",
      pipelineStation,
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  if (asset.id === activeId || asset.status === "PROCESSING") {
    return {
      stage: "stt_processing",
      phase: "transcription",
      label: "Transcripción",
      hint: "Deepgram transcribiendo.",
      pipelineStation: "STT",
      pipelineError: asset.pipelineError,
      distill: buildDistillStepper({
        pipelineStation: "STT",
        pipelineError: asset.pipelineError,
        status: asset.status,
      }),
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
      hint: "En cola STT.",
      pipelineStation: "STT",
      pipelineError: asset.pipelineError,
      distill: buildDistillStepper({
        pipelineStation: "STT",
        pipelineError: asset.pipelineError,
        status: asset.status,
      }),
    };
  }

  if (asset.status === "ERROR" || pipelineStation === "ERROR") {
    return {
      stage: "stt_error",
      phase: "transcription",
      label: "Error",
      hint: asset.pipelineError ?? "Falló la metabolización.",
      needsAttention: true,
      pipelineStation: "ERROR",
      pipelineError: asset.pipelineError,
      distill,
    };
  }

  return {
    stage: "pending_stt",
    phase: "transcription",
    label: "En cola",
    hint: "Esperando turno de destilación.",
    pipelineStation,
    pipelineError: asset.pipelineError,
    distill,
  };
}

export const METABOLISM_PHASES: Array<{
  id: MetabolismPhase;
  label: string;
}> = [
  { id: "transcription", label: "STT" },
  { id: "lineage", label: "LINEAGE" },
  { id: "quant", label: "QUANT" },
  { id: "vectors", label: "VECTORS" },
  { id: "validation", label: "HITL" },
  { id: "coagulation", label: "COAG" },
];

export function resolvePhaseProgress(
  pipeline: AudioPipelineInfo,
): Record<MetabolismPhase, "pending" | "active" | "done" | "attention"> {
  const progress: Record<
    MetabolismPhase,
    "pending" | "active" | "done" | "attention"
  > = {
    transcription: "pending",
    lineage: "pending",
    quant: "pending",
    vectors: "pending",
    validation: "pending",
    coagulation: "pending",
  };

  const map: Record<DistillStation, MetabolismPhase> = {
    STT: "transcription",
    LINEAGE: "lineage",
    QUANT: "quant",
    VECTORS: "vectors",
    HITL: "validation",
    COAG: "coagulation",
  };

  for (const station of DISTILL_STATIONS) {
    const phase = map[station];
    const state = pipeline.distill.steps[station];
    if (state === "done") progress[phase] = "done";
    else if (state === "active") progress[phase] = "active";
    else if (state === "error") progress[phase] = "attention";
  }

  if (pipeline.needsAttention) {
    progress[pipeline.phase] = "attention";
  }

  return progress;
}
