import "server-only";

import { buildPendingTaskUniverseFilter } from "@/lib/babel/projection";
import {
  COAGULATE_SIGNAL_FACTOR,
  MICROTASK_MAX_MIN,
  type EcosystemArea,
} from "@/lib/calendario/constants";
import type { MissionCardDto } from "@/lib/calendario/types";
import { filterContextEventsForUniverse } from "@/lib/babel/universe-refs";
import type { EventPillar } from "@/lib/events/types";
import { prisma } from "@/lib/prisma";

function inferAreaFromPillar(pillar: string): EcosystemArea | null {
  if (["rendimiento", "combustible", "recuperacion", "estado_base"].includes(pillar)) {
    return "salud";
  }
  if (pillar === "proyecto") return "tecnologia";
  if (pillar === "general") return "meta";
  return null;
}

function clampActionCost(value: number | null | undefined, fallback = 3): number {
  if (value == null || Number.isNaN(value)) return fallback;
  return Math.min(12, Math.max(1, value));
}

/** Hook tipado para marcadores universitarios / hackathons (futuro). */
export async function listMarkerMissionCards(
  _universeSlug?: string,
): Promise<MissionCardDto[]> {
  return [];
}

export async function buildMissionDeck(input: {
  universeSlug?: string;
  area?: EcosystemArea;
  limit?: number;
}): Promise<MissionCardDto[]> {
  const limit = input.limit ?? 24;
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 14);

  const [tasks, microtasks, proposedEvents, markerCards] = await Promise.all([
    prisma.pendingTask.findMany({
      where: {
        status: { in: ["suggested", "recognized", "calibrated"] },
        targetDay: { gte: now, lt: horizon },
        ...buildPendingTaskUniverseFilter(input.universeSlug),
      },
      orderBy: [{ weight: "desc" }, { targetDay: "asc" }],
      take: limit,
    }),
    prisma.ludusMicrotask.findMany({
      where: { status: "pending" },
      orderBy: [{ baseWeight: "desc" }, { forgedAt: "asc" }],
      take: limit,
    }),
    prisma.contextEvent.findMany({
      where: {
        status: "proposed",
        occurredAt: { gte: now, lt: horizon },
      },
      orderBy: { occurredAt: "asc" },
      take: limit,
    }),
    listMarkerMissionCards(input.universeSlug),
  ]);

  const filteredProposed = await filterContextEventsForUniverse(
    proposedEvents,
    input.universeSlug,
  );

  const cards: MissionCardDto[] = [];

  for (const task of tasks) {
    const durationMin = 15;
    const area: EcosystemArea | null = null;
    if (input.area && area !== input.area) continue;
    cards.push({
      id: `task-${task.id}`,
      source: "pending_task",
      sourceId: task.id,
      title: task.title,
      actionCost: clampActionCost(task.weight, 4),
      durationMin,
      ecosystemArea: area,
      blockKind: "SUGGESTION",
    });
  }

  for (const micro of microtasks) {
    const durationMin = Math.min(micro.estimatedMin, MICROTASK_MAX_MIN);
    const area: EcosystemArea = "tecnologia";
    if (input.area && area !== input.area) continue;
    cards.push({
      id: `micro-${micro.id}`,
      source: "microtask",
      sourceId: micro.id,
      title: micro.title,
      actionCost: clampActionCost(micro.baseWeight, 3),
      durationMin,
      ecosystemArea: area,
      blockKind: "SUGGESTION",
    });
  }

  for (const event of filteredProposed) {
    const area = inferAreaFromPillar(event.pillar as EventPillar);
    if (input.area && area !== input.area) continue;
    const structured =
      event.structuredData && typeof event.structuredData === "object"
        ? (event.structuredData as Record<string, unknown>)
        : {};
    const durationMin =
      typeof structured.durationMin === "number" ? structured.durationMin : 15;
    cards.push({
      id: `event-${event.id}`,
      source: "proposed_event",
      sourceId: event.id,
      title: event.content,
      actionCost: clampActionCost(
        typeof structured.actionCost === "number"
          ? structured.actionCost
          : null,
        3,
      ),
      durationMin,
      ecosystemArea: area,
      blockKind: "SUGGESTION",
    });
  }

  cards.push(...markerCards.filter((c) => !input.area || c.ecosystemArea === input.area));

  return cards
    .sort((a, b) => b.actionCost - a.actionCost)
    .slice(0, limit);
}

export function previewSignalPoints(actionCost: number): number {
  return Math.ceil(actionCost * COAGULATE_SIGNAL_FACTOR);
}
