import "server-only";

import { buildPendingTaskUniverseFilter, getTrenchesBoostForUniverse } from "@/lib/babel/projection";
import { dayRangeForOffset } from "@/lib/pendientes/day";
import { mapPendingTask } from "@/lib/pendientes/mappers";
import type { DayOffset, PendingTaskDto } from "@/lib/pendientes/types";
import { prisma } from "@/lib/prisma";

const MAX_ASALTOS = 4;

export type AsaltoItem = PendingTaskDto & {
  tier: "boss" | "priority" | "recognized";
  effectiveWeight: number;
};

function tierForEffectiveWeight(weight: number): AsaltoItem["tier"] {
  if (weight >= 10) return "boss";
  if (weight >= 7) return "priority";
  return "recognized";
}

function effectiveWeightForTask(
  task: PendingTaskDto,
  trenchesBoost: number,
): number {
  return (task.weight ?? 0) + trenchesBoost;
}

export async function selectAsaltosForDay(
  day: DayOffset = "today",
  universeSlug?: string,
): Promise<AsaltoItem[]> {
  const { start, end } = dayRangeForOffset(day);
  const universeFilter = buildPendingTaskUniverseFilter(universeSlug);
  const trenchesBoost = await getTrenchesBoostForUniverse(universeSlug);

  const rows = await prisma.pendingTask.findMany({
    where: {
      targetDay: { gte: start, lt: end },
      status: { in: ["calibrated", "recognized"] },
      ...universeFilter,
    },
    orderBy: [{ weight: "desc" }, { recognizedAt: "desc" }, { createdAt: "desc" }],
    take: 30,
  });

  const tasks = rows
    .map(mapPendingTask)
    .map((task) => {
      const effectiveWeight = effectiveWeightForTask(task, trenchesBoost);
      return {
        ...task,
        effectiveWeight,
        tier: tierForEffectiveWeight(effectiveWeight),
      };
    })
    .sort((a, b) => b.effectiveWeight - a.effectiveWeight);

  const bosses = tasks.filter((t) => t.effectiveWeight >= 10);
  const priorities = tasks.filter(
    (t) => t.effectiveWeight >= 7 && t.effectiveWeight < 10,
  );
  const recognized = tasks.filter(
    (t) => t.status === "recognized" && (t.weight === null || t.effectiveWeight < 7),
  );

  const selected: AsaltoItem[] = [];

  for (const task of bosses) {
    if (selected.length >= MAX_ASALTOS) break;
    selected.push(task);
  }

  for (const task of priorities) {
    if (selected.length >= MAX_ASALTOS) break;
    if (selected.some((s) => s.id === task.id)) continue;
    selected.push(task);
  }

  if (selected.length < MAX_ASALTOS && recognized[0]) {
    selected.push(recognized[0]);
  }

  return selected.slice(0, MAX_ASALTOS);
}
