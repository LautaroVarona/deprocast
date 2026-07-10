import type { PendingTask } from "@prisma/client";
import type { PendingTaskDto } from "@/lib/pendientes/types";

export function mapPendingTask(row: PendingTask): PendingTaskDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as PendingTaskDto["status"],
    source: row.source as PendingTaskDto["source"],
    sourceRef: row.sourceRef,
    targetDay: row.targetDay.toISOString(),
    weight: row.weight,
    bloque: row.bloque,
    projectId: row.projectId,
    reviewId: row.reviewId,
    universeSlug: row.universeSlug,
    listadorConfidence: row.listadorConfidence,
    recognizedAt: row.recognizedAt?.toISOString() ?? null,
    calibratedAt: row.calibratedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
