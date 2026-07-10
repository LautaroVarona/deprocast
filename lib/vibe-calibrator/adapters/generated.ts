import "server-only";

import { listTasksForCalibration } from "@/lib/pendientes/store";
import type {
  CalibratorQueueConfig,
  CardSourceAdapter,
  VibeCalibrationCard,
} from "../types";

async function fetchGeneratedCards(
  config: CalibratorQueueConfig,
): Promise<VibeCalibrationCard[]> {
  const tasks = await listTasksForCalibration(config.limit);
  return tasks.map(
    (task): VibeCalibrationCard => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      source: "generated",
      sourceRef: task.id,
      metadata: {
        pendingTaskId: task.id,
        weight: task.weight,
        bloque: task.bloque,
        status: task.status,
        source: task.source,
      },
    }),
  );
}

export const generatedAdapter: CardSourceAdapter = {
  source: "generated",
  fetchCards: fetchGeneratedCards,
};
