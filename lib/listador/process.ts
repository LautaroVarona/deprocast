import "server-only";

import { extractTasksFromText } from "@/lib/listador/extract";
import { resolveDayOffset } from "@/lib/pendientes/day";
import {
  createPendingTask,
  findDuplicateTask,
} from "@/lib/pendientes/store";
import type { PendingTaskDto, PendingTaskSource } from "@/lib/pendientes/types";
import type { IngestaChannel } from "@/lib/purifier/constants";

export type ProcessListadorInput = {
  rawText: string;
  source: PendingTaskSource | IngestaChannel;
  sourceRef?: string;
  occurredAt?: Date;
  reviewId?: string;
  universeSlug?: string;
};

export async function processListadorForText(
  input: ProcessListadorInput,
): Promise<PendingTaskDto[]> {
  const extraction = await extractTasksFromText(input.rawText);
  if (extraction.tasks.length === 0) return [];

  const baseDate = input.occurredAt ?? new Date();
  const created: PendingTaskDto[] = [];

  for (const suggestion of extraction.tasks) {
    const duplicate = await findDuplicateTask({
      title: suggestion.title,
      sourceRef: input.sourceRef,
    });
    if (duplicate) continue;

    const targetDay = resolveDayOffset(
      suggestion.targetDayOffset ?? "today",
      baseDate,
    );

    const task = await createPendingTask({
      title: suggestion.title,
      description: suggestion.description,
      source: input.source as PendingTaskSource,
      sourceRef: input.sourceRef,
      targetDay,
      bloque: suggestion.bloque,
      reviewId: input.reviewId,
      listadorConfidence: suggestion.confidence,
      status: "suggested",
      universeSlug: input.universeSlug,
    });

    created.push(task);
  }

  return created;
}
