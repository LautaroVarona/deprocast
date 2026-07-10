import "server-only";

import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { normalizeDayStart, dayRangeForOffset } from "@/lib/pendientes/day";
import { mapPendingTask } from "@/lib/pendientes/mappers";
import type {
  DayOffset,
  PendingTaskDto,
  PendingTaskSource,
  PendingTaskStatus,
} from "@/lib/pendientes/types";
import { MIN_CALIBRATION_WEIGHT } from "@/lib/pendientes/types";
import { prisma } from "@/lib/prisma";

function clampWeight(value: number): number {
  return Math.min(MAX_BASE_WEIGHT, Math.max(MIN_BASE_WEIGHT, Math.round(value)));
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type CreatePendingTaskInput = {
  title: string;
  description?: string;
  source: PendingTaskSource;
  sourceRef?: string;
  targetDay?: Date;
  bloque?: string;
  projectId?: string;
  reviewId?: string;
  listadorConfidence?: number;
  status?: PendingTaskStatus;
  universeSlug?: string;
};

export async function createPendingTask(
  input: CreatePendingTaskInput,
): Promise<PendingTaskDto> {
  const targetDay = normalizeDayStart(input.targetDay ?? new Date());
  const row = await prisma.pendingTask.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "suggested",
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      targetDay,
      bloque: input.bloque ?? null,
      projectId: input.projectId ?? null,
      reviewId: input.reviewId ?? null,
      listadorConfidence: input.listadorConfidence ?? null,
      universeSlug: input.universeSlug ?? null,
    },
  });
  return mapPendingTask(row);
}

export async function findDuplicateTask(input: {
  title: string;
  sourceRef?: string;
  withinHours?: number;
}): Promise<PendingTaskDto | null> {
  const since = new Date();
  since.setHours(since.getHours() - (input.withinHours ?? 24));
  const normalized = normalizeTitle(input.title);

  const candidates = await prisma.pendingTask.findMany({
    where: {
      createdAt: { gte: since },
      status: { not: "rejected" },
      ...(input.sourceRef ? { sourceRef: input.sourceRef } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const match = candidates.find(
    (row) => normalizeTitle(row.title) === normalized,
  );
  return match ? mapPendingTask(match) : null;
}

export async function listPendingTasks(input: {
  day?: DayOffset;
  status?: PendingTaskStatus | PendingTaskStatus[];
  limit?: number;
  allDays?: boolean;
  universeSlug?: string;
}): Promise<PendingTaskDto[]> {
  const statuses = input.status
    ? Array.isArray(input.status)
      ? input.status
      : [input.status]
    : undefined;

  const dayFilter =
    !input.allDays && input.day
      ? (() => {
          const { start, end } = dayRangeForOffset(input.day);
          return { targetDay: { gte: start, lt: end } };
        })()
      : {};

  const { buildPendingTaskUniverseFilter } = await import(
    "@/lib/babel/projection"
  );
  const universeFilter = buildPendingTaskUniverseFilter(input.universeSlug);

  const rows = await prisma.pendingTask.findMany({
    where: {
      ...dayFilter,
      ...universeFilter,
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    orderBy: [{ weight: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 100,
  });

  return rows.map(mapPendingTask);
}

export async function getPendingTaskById(
  id: string,
): Promise<PendingTaskDto | null> {
  const row = await prisma.pendingTask.findUnique({ where: { id } });
  return row ? mapPendingTask(row) : null;
}

export async function recognizePendingTask(
  id: string,
): Promise<PendingTaskDto> {
  const row = await prisma.pendingTask.update({
    where: { id },
    data: {
      status: "recognized",
      recognizedAt: new Date(),
    },
  });
  return mapPendingTask(row);
}

export async function rejectPendingTask(id: string): Promise<PendingTaskDto> {
  const row = await prisma.pendingTask.update({
    where: { id },
    data: { status: "rejected" },
  });
  return mapPendingTask(row);
}

export async function completePendingTask(id: string): Promise<PendingTaskDto> {
  const row = await prisma.pendingTask.update({
    where: { id },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });
  return mapPendingTask(row);
}

export async function calibratePendingTask(
  id: string,
  weight: number,
): Promise<PendingTaskDto> {
  const clamped = clampWeight(weight);
  const now = new Date();

  if (clamped < MIN_CALIBRATION_WEIGHT) {
    const row = await prisma.pendingTask.update({
      where: { id },
      data: {
        status: "rejected",
        weight: clamped,
        calibratedAt: now,
      },
    });
    return mapPendingTask(row);
  }

  const row = await prisma.pendingTask.update({
    where: { id },
    data: {
      status: "calibrated",
      weight: clamped,
      calibratedAt: now,
    },
  });
  return mapPendingTask(row);
}

export async function listTasksForCalibration(
  limit = 20,
): Promise<PendingTaskDto[]> {
  const rows = await prisma.pendingTask.findMany({
    where: {
      status: { in: ["recognized", "calibrated"] },
    },
    orderBy: [{ recognizedAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
  return rows.map(mapPendingTask);
}
