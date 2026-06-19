import { generatedAdapter } from "./adapters/generated";
import { validatedAdapter } from "./adapters/validated";
import { DEFAULT_QUEUE_CONFIG, MAX_QUEUE_LIMIT, MIN_QUEUE_LIMIT } from "./constants";
import type {
  CalibratorCardSource,
  CalibratorQueueConfig,
  CardSourceAdapter,
  VibeCalibrationCard,
} from "./types";

const ADAPTERS: Record<CalibratorCardSource, CardSourceAdapter> = {
  validated: validatedAdapter,
  generated: generatedAdapter,
};

export function normalizeQueueConfig(
  partial: Partial<CalibratorQueueConfig> | null | undefined,
): CalibratorQueueConfig {
  const sources = (partial?.sources ?? DEFAULT_QUEUE_CONFIG.sources).filter(
    (source): source is CalibratorCardSource =>
      source === "validated" || source === "generated",
  );

  const limit = Math.min(
    MAX_QUEUE_LIMIT,
    Math.max(MIN_QUEUE_LIMIT, partial?.limit ?? DEFAULT_QUEUE_CONFIG.limit),
  );

  return {
    sources: sources.length > 0 ? sources : ["validated"],
    campoSlug: partial?.campoSlug?.trim() || undefined,
    limit,
  };
}

export async function buildCalibrationQueue(
  config: CalibratorQueueConfig,
): Promise<VibeCalibrationCard[]> {
  const normalized = normalizeQueueConfig(config);
  const batches = await Promise.all(
    normalized.sources.map((source) => ADAPTERS[source].fetchCards(normalized)),
  );

  const seen = new Set<string>();
  const merged: VibeCalibrationCard[] = [];

  for (const batch of batches) {
    for (const card of batch) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      merged.push(card);
    }
  }

  return merged.slice(0, normalized.limit);
}
