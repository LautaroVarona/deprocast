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
  | "error"
  | "idle";

export function resolveMetabolismCardTone(
  pipeline: AudioPipelineInfo,
): MetabolismCardTone {
  switch (pipeline.stage) {
    case "stt_processing":
    case "stt_queued":
      return "processing";
    case "in_validation":
      return "hitl";
    case "validated":
      return "alma";
    case "stt_error":
      return "error";
    default:
      return "idle";
  }
}

export const METABOLISM_FILTER_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "processing", label: "Procesando" },
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
    return tone === "processing" || tone === "idle";
  }
  return tone === filter;
}
