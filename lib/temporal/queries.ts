import "server-only";

import { buildPendingTaskUniverseFilter } from "@/lib/babel/projection";
import { filterContextEventsForUniverse } from "@/lib/babel/universe-refs";
import {
  extractLocationFromStructuredData,
  parseGeoPayload,
  type GeoPayload,
} from "@/lib/geo/types";
import { mapPendingTask } from "@/lib/pendientes/mappers";
import { prisma } from "@/lib/prisma";
import type { TemporalBlock } from "@/lib/temporal/types";

function parseStructuredData(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function resolveLocationFromData(
  structuredData: Record<string, unknown>,
): Promise<GeoPayload | null> {
  const inline = extractLocationFromStructuredData(structuredData);
  if (inline) return inline;

  const locationId =
    typeof structuredData.locationId === "string"
      ? structuredData.locationId
      : typeof (structuredData.location as { locationId?: string } | undefined)
            ?.locationId === "string"
        ? (structuredData.location as { locationId: string }).locationId
        : null;

  if (!locationId) return null;

  const row = await prisma.geoLocation.findUnique({ where: { id: locationId } });
  if (!row) return null;

  return parseGeoPayload({
    locationId: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
    label: row.name,
  });
}

function taskToBlock(task: ReturnType<typeof mapPendingTask>): TemporalBlock {
  return {
    kind: "task",
    id: task.id,
    title: task.title,
    start: task.targetDay,
    end: null,
    status: task.status,
    projectId: task.projectId,
    weight: task.weight,
    source: task.source,
  };
}

function eventToBlock(
  event: {
    id: string;
    content: string;
    occurredAt: Date;
    status: string;
    source: string;
    pillar?: string;
    structuredData?: unknown;
    blockKind?: string;
    actionCost?: number | null;
    executionStatus?: string;
    ecosystemArea?: string | null;
    endsAt?: Date | null;
    durationMin?: number | null;
  },
  location: GeoPayload | null,
): TemporalBlock {
  const structuredData = parseStructuredData(event.structuredData);
  return {
    kind: "event",
    id: event.id,
    title: event.content,
    start: event.occurredAt.toISOString(),
    end: event.endsAt?.toISOString() ?? null,
    status: event.status,
    projectId: null,
    weight: event.actionCost,
    source: event.source,
    pillar: event.pillar,
    structuredData,
    location,
    blockKind: event.blockKind as TemporalBlock["blockKind"],
    actionCost: event.actionCost,
    executionStatus: event.executionStatus as TemporalBlock["executionStatus"],
    ecosystemArea: event.ecosystemArea as TemporalBlock["ecosystemArea"],
    durationMin: event.durationMin,
  };
}

export async function listTemporalBlocksByRange(input: {
  from: Date;
  to: Date;
  universeSlug?: string;
}) {
  const [tasksRows, eventsRows] = await Promise.all([
    prisma.pendingTask.findMany({
      where: {
        targetDay: { gte: input.from, lt: input.to },
        ...buildPendingTaskUniverseFilter(input.universeSlug),
        status: { in: ["suggested", "recognized", "calibrated"] },
      },
      orderBy: [{ targetDay: "asc" }, { weight: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
    prisma.contextEvent.findMany({
      where: {
        occurredAt: { gte: input.from, lt: input.to },
        status: { not: "rejected" },
      },
      orderBy: { occurredAt: "asc" },
      take: 500,
    }),
  ]);

  const tasks = tasksRows.map(mapPendingTask).map(taskToBlock);
  const filteredEvents = await filterContextEventsForUniverse(
    eventsRows,
    input.universeSlug,
  );

  const events: TemporalBlock[] = [];
  for (const event of filteredEvents) {
    const structuredData = parseStructuredData(event.structuredData);
    const location = await resolveLocationFromData(structuredData);
    events.push(eventToBlock(event, location));
  }

  const blocks = [...tasks, ...events].sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  return { tasks, events, blocks };
}
