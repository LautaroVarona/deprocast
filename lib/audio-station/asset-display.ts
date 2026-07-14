import type { AudioAssetSummary } from "@/lib/audio-station/types";
import type { AudioPipelineInfo } from "@/lib/audio-station/pipeline-status";

export function getAssetDisplayStatus(
  asset: Pick<AudioAssetSummary, "id" | "status">,
  queuedIds: Set<string>,
  activeId: string | null,
): string {
  if (asset.status === "PROCESSING" || asset.id === activeId) {
    return "PROCESSING";
  }

  if (
    (asset.status === "PENDING" || asset.status === "ERROR") &&
    queuedIds.has(asset.id)
  ) {
    return "QUEUED";
  }

  return asset.status;
}

export type MetabolismCardTone =
  | "processing"
  | "hitl"
  | "alma"
  | "attention"
  | "idle";

export function resolveMetabolismCardTone(
  pipeline: AudioPipelineInfo,
): MetabolismCardTone {
  if (pipeline.needsAttention) {
    return "attention";
  }

  switch (pipeline.stage) {
    case "stt_processing":
    case "stt_queued":
    case "purifying":
    case "pending_stt":
      return "processing";
    case "in_validation":
      return "hitl";
    case "validated":
      return "alma";
    default:
      return "idle";
  }
}

export const METABOLISM_FILTER_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "processing", label: "Procesando" },
  { id: "attention", label: "Atención requerida" },
  { id: "hitl", label: "Requiere validación" },
  { id: "alma", label: "Metabolizado" },
] as const;

export type MetabolismFilter =
  (typeof METABOLISM_FILTER_OPTIONS)[number]["id"];

export function matchesMetabolismFilter(
  tone: MetabolismCardTone,
  filter: MetabolismFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "processing") {
    return tone === "processing";
  }
  return tone === filter;
}
