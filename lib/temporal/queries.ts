import "server-only";

import { buildPendingTaskUniverseFilter } from "@/lib/babel/projection";
import { filterContextEventsForUniverse } from "@/lib/babel/universe-refs";
import { mapPendingTask } from "@/lib/pendientes/mappers";
import { prisma } from "@/lib/prisma";
import type { TemporalBlock } from "@/lib/temporal/types";

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

function eventToBlock(event: {
  id: string;
  content: string;
  occurredAt: Date;
  status: string;
  source: string;
}): TemporalBlock {
  return {
    kind: "event",
    id: event.id,
    title: event.content,
    start: event.occurredAt.toISOString(),
    end: null,
    status: event.status,
    projectId: null,
    weight: null,
    source: event.source,
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
  const events = filteredEvents.map(eventToBlock);
  const blocks = [...tasks, ...events].sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  return { tasks, events, blocks };
}
