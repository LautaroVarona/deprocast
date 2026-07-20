import { z } from "zod";
import { BLOQUE_PRIORIDADES } from "@/lib/jornada/types";

export const PENDING_TASK_STATUSES = [
  "suggested",
  "recognized",
  "rejected",
  "calibrated",
  "completed",
] as const;

export type PendingTaskStatus = (typeof PENDING_TASK_STATUSES)[number];

export const PENDING_TASK_SOURCES = [
  "listador",
  "quantador",
  "manual",
  "journal",
  "audio",
  "texto",
  "tablas",
  "vision",
  "x-bookmarks",
  "purifier",
] as const;

export type PendingTaskSource = (typeof PENDING_TASK_SOURCES)[number];

export const DAY_OFFSETS = ["yesterday", "today", "tomorrow"] as const;
export type DayOffset = (typeof DAY_OFFSETS)[number];

export type PendingTaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: PendingTaskStatus;
  source: PendingTaskSource;
  sourceRef: string | null;
  targetDay: string;
  weight: number | null;
  bloque: string | null;
  projectId: string | null;
  reviewId: string | null;
  universeSlug: string | null;
  listadorConfidence: number | null;
  recognizedAt: string | null;
  calibratedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const createPendingTaskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional(),
  targetDay: z.enum(DAY_OFFSETS).optional(),
  bloque: z.enum(BLOQUE_PRIORIDADES).optional(),
  projectId: z.string().optional(),
});

export const patchPendingTaskSchema = z.object({
  action: z.enum(["recognize", "reject", "complete", "reschedule"]),
  targetDay: z.string().datetime().optional(),
});

export const calibratePendingTaskSchema = z.object({
  weight: z.number().int().min(1).max(12),
});

export const MIN_CALIBRATION_WEIGHT = 4;

export function isPendingTaskStatus(value: string): value is PendingTaskStatus {
  return PENDING_TASK_STATUSES.includes(value as PendingTaskStatus);
}

export function isPendingTaskSource(value: string): value is PendingTaskSource {
  return PENDING_TASK_SOURCES.includes(value as PendingTaskSource);
}

export function isDayOffset(value: string): value is DayOffset {
  return DAY_OFFSETS.includes(value as DayOffset);
}
