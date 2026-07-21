import "server-only";

import { previewSignalPoints } from "@/lib/calendario/deck";
import type { CoagulateInput, CoagulateResult } from "@/lib/calendario/types";
import { coagulateInputSchema } from "@/lib/calendario/types";
import { mapContextEvent } from "@/lib/events/mappers";
import type { ContextEventDto } from "@/lib/events/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function resolveCardMeta(input: CoagulateInput): Promise<{
  title: string;
  actionCost: number;
  durationMin: number;
  ecosystemArea: string | null;
  sourceRef: string;
}> {
  if (input.cardSource === "pending_task") {
    const task = await prisma.pendingTask.findUnique({
      where: { id: input.cardId },
    });
    if (!task) throw new Error("Tarea no encontrada en el mazo.");
    return {
      title: task.title,
      actionCost: task.weight ?? 4,
      durationMin: input.durationMin ?? 15,
      ecosystemArea: input.ecosystemArea ?? null,
      sourceRef: `pending_task:${task.id}`,
    };
  }

  if (input.cardSource === "microtask") {
    const micro = await prisma.ludusMicrotask.findUnique({
      where: { id: input.cardId },
    });
    if (!micro) throw new Error("Microtarea no encontrada en el mazo.");
    return {
      title: micro.title,
      actionCost: micro.baseWeight,
      durationMin: input.durationMin ?? micro.estimatedMin,
      ecosystemArea: input.ecosystemArea ?? "tecnologia",
      sourceRef: `microtask:${micro.id}`,
    };
  }

  const event = await prisma.contextEvent.findUnique({
    where: { id: input.cardId },
  });
  if (!event || event.status !== "proposed") {
    throw new Error("Evento propuesto no encontrado en el mazo.");
  }
  const structured =
    event.structuredData && typeof event.structuredData === "object"
      ? (event.structuredData as Record<string, unknown>)
      : {};
  return {
    title: event.content,
    actionCost:
      typeof structured.actionCost === "number" ? structured.actionCost : 3,
    durationMin:
      input.durationMin ??
      (typeof structured.durationMin === "number" ? structured.durationMin : 15),
    ecosystemArea: input.ecosystemArea ?? event.ecosystemArea,
    sourceRef: `proposed_event:${event.id}`,
  };
}

export async function coagulateMissionCard(
  raw: CoagulateInput,
): Promise<CoagulateResult> {
  const input = coagulateInputSchema.parse(raw);
  const meta = await resolveCardMeta(input);
  const endsAt = addMinutes(input.occurredAt, meta.durationMin);
  const actionCost = Math.min(12, Math.max(1, meta.actionCost));

  if (input.cardSource === "proposed_event") {
    const existing = await prisma.contextEvent.findUnique({
      where: { id: input.cardId },
    });
    if (!existing) throw new Error("Evento propuesto no encontrado.");
    const prevStructured =
      existing.structuredData && typeof existing.structuredData === "object"
        ? (existing.structuredData as Record<string, unknown>)
        : {};

    const updated = await prisma.contextEvent.update({
      where: { id: input.cardId },
      data: {
        occurredAt: input.occurredAt,
        endsAt,
        durationMin: meta.durationMin,
        actionCost,
        blockKind: "SUGGESTION",
        executionStatus: "coagulated",
        status: "confirmed",
        ecosystemArea: meta.ecosystemArea,
        structuredData: {
          ...prevStructured,
          coagulatedAt: new Date().toISOString(),
          sourceRef: meta.sourceRef,
        } as Prisma.InputJsonValue,
      },
      include: { links: true },
    });

    return {
      eventId: updated.id,
      occurredAt: updated.occurredAt.toISOString(),
      endsAt: updated.endsAt?.toISOString() ?? null,
      executionStatus: "coagulated",
      signalPreview: previewSignalPoints(actionCost),
    };
  }

  const created = await prisma.contextEvent.create({
    data: {
      occurredAt: input.occurredAt,
      endsAt,
      durationMin: meta.durationMin,
      actionCost,
      blockKind: "SUGGESTION",
      executionStatus: "coagulated",
      status: "confirmed",
      ecosystemArea: meta.ecosystemArea,
      source: "manual",
      sourceRef: meta.sourceRef,
      content: meta.title,
      pillar: "proyecto",
      structuredData: {
        coagulatedAt: new Date().toISOString(),
        cardSource: input.cardSource,
        cardId: input.cardId,
      } as Prisma.InputJsonValue,
    },
    include: { links: true },
  });

  if (input.cardSource === "pending_task") {
    await prisma.pendingTask.update({
      where: { id: input.cardId },
      data: { targetDay: input.occurredAt },
    });
  }

  return {
    eventId: created.id,
    occurredAt: created.occurredAt.toISOString(),
    endsAt: created.endsAt?.toISOString() ?? null,
    executionStatus: "coagulated",
    signalPreview: previewSignalPoints(actionCost),
  };
}

export async function patchBlockExecution(
  eventId: string,
  executionStatus: string,
): Promise<ContextEventDto> {
  const updated = await prisma.contextEvent.update({
    where: { id: eventId },
    data: { executionStatus },
    include: { links: true },
  });
  return mapContextEvent(updated);
}
