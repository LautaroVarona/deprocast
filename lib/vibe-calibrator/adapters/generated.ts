import type {
  CalibratorQueueConfig,
  CardSourceAdapter,
  VibeCalibrationCard,
} from "../types";

/**
 * Stub para cards generadas por pipeline propio del Observador.
 * Extender fetchGeneratedCards cuando el generador esté listo.
 */
async function fetchGeneratedCards(
  _config: CalibratorQueueConfig,
): Promise<VibeCalibrationCard[]> {
  return [];
}

export const generatedAdapter: CardSourceAdapter = {
  source: "generated",
  fetchCards: fetchGeneratedCards,
};
