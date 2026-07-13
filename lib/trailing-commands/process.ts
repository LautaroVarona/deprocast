import "server-only";

import { createProposedEvents } from "@/lib/events/service";
import type { EventLinkInput } from "@/lib/events/types";
import { extractTrailingCommandsFromText } from "@/lib/trailing-commands/extract";
import {
  resolveCommandOccurredAt,
  resolveCommandTargetDay,
} from "@/lib/trailing-commands/schedule";
import type { TrailingCommandsResult } from "@/lib/trailing-commands/types";
import {
  createPendingTask,
  findDuplicateTask,
} from "@/lib/pendientes/store";
import type { PendingTaskSource } from "@/lib/pendientes/types";
import type { IngestaChannel } from "@/lib/purifier/constants";
import { randomUUID } from "node:crypto";

export type ProcessTrailingCommandsInput = {
  rawText: string;
  source: PendingTaskSource | IngestaChannel;
  sourceRef?: string;
  reviewId?: string;
  assetId?: string;
  occurredAt?: Date;
  universeSlug?: string;
};

export async function processTrailingCommands(
  input: ProcessTrailingCommandsInput,
): Promise<TrailingCommandsResult> {
  const extraction = await extractTrailingCommandsFromText(input.rawText);
  if (extraction.commands.length === 0) {
    return { tasksCreated: 0, eventsCreated: 0 };
  }

  const baseDate = input.occurredAt ?? new Date();
  const correlationId = randomUUID();
  let tasksCreated = 0;
  const calendarEvents: Array<{
    content: string;
    pillar: "general" | "proyecto";
    structuredData: Record<string, unknown>;
    summary: string;
    links: EventLinkInput[];
  }> = [];

  for (const command of extraction.commands) {
    const duplicate = await findDuplicateTask({
      title: command.title,
      sourceRef: input.sourceRef,
    });
    if (duplicate) continue;

    const targetDay = resolveCommandTargetDay(command, baseDate);
    const shouldCalendar =
      command.injectCalendar === true ||
      command.weekday !== undefined ||
      command.timeOfDay !== undefined;

    await createPendingTask({
      title: command.title,
      description: command.description,
      source: input.source as PendingTaskSource,
      sourceRef: input.sourceRef,
      targetDay,
      bloque: command.bloque,
      reviewId: input.reviewId,
      listadorConfidence: command.confidence,
      status: "suggested",
      universeSlug: input.universeSlug,
    });
    tasksCreated += 1;

    if (shouldCalendar) {
      const occurredAt = resolveCommandOccurredAt(command, baseDate);
      const links: EventLinkInput[] = [];

      if (input.assetId) {
        links.push({
          entityType: "transcript",
          entityId: input.assetId,
          entityLabel: input.assetId,
          linkRole: "related",
        });
      }

      calendarEvents.push({
        content: command.title,
        pillar: "general",
        structuredData: {
          actionItem: true,
          scheduledAt: occurredAt.toISOString(),
          targetDay: targetDay.toISOString(),
          ...(command.timeOfDay ? { timeOfDay: command.timeOfDay } : {}),
          ...(command.description ? { note: command.description } : {}),
          trailingCommand: true,
        },
        summary: command.description ?? command.title,
        links,
      });
    }
  }

  let eventsCreated = 0;
  if (calendarEvents.length > 0) {
    const created = await createProposedEvents({
      source: "audio",
      sourceRef: input.reviewId ?? input.sourceRef,
      occurredAt: baseDate,
      correlationId,
      events: calendarEvents,
    });
    eventsCreated = created.length;
  }

  return { tasksCreated, eventsCreated };
}
