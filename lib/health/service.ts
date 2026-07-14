import type { HealthPillar, HealthRecordDto } from "@/lib/events/types";
import { PILLAR_LABELS } from "@/lib/events/types";
import { createConfirmedManualHealthEvent } from "@/lib/events/service";
import { mapHealthRecord } from "@/lib/events/mappers";
import { publishHealthToTimeline } from "@/lib/cronista/publish";
import { logHealthSpecialistActivity } from "@/lib/health/activity-log";
import { prisma } from "@/lib/prisma";

export type CreateHealthRecordInput = {
  pillar: HealthPillar;
  occurredAt?: Date;
  summary: string;
  metrics: Record<string, unknown>;
};

export async function createHealthRecord(
  input: CreateHealthRecordInput,
): Promise<{ record: HealthRecordDto; event: Awaited<ReturnType<typeof createConfirmedManualHealthEvent>>["event"] }> {
  const occurredAt = input.occurredAt ?? new Date();
  const content = `${PILLAR_LABELS[input.pillar]}: ${input.summary}`;

  const result = await createConfirmedManualHealthEvent({
    pillar: input.pillar,
    occurredAt,
    content,
    summary: input.summary,
    metrics: input.metrics,
  });

  void logHealthSpecialistActivity({
    recordId: result.record.id,
    pillar: input.pillar,
    pillarLabel: PILLAR_LABELS[input.pillar],
    summary: input.summary,
    occurredAt,
    metrics: input.metrics,
  }).catch((error) => {
    console.error("[historial] health_recorded log error:", error);
  });

  void publishHealthToTimeline({
    record: result.record,
    event: result.event,
  }).catch((error) => {
    console.error("[cronista] publish error:", error);
  });

  return { record: result.record, event: result.event };
}

export async function listHealthRecords(options?: {
  pillar?: HealthPillar;
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<HealthRecordDto[]> {
  const records = await prisma.healthRecord.findMany({
    where: {
      ...(options?.pillar ? { pillar: options.pillar } : {}),
      ...(options?.from || options?.to
        ? {
            occurredAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { occurredAt: "desc" },
    take: options?.limit ?? 100,
  });

  return records.map(mapHealthRecord);
}

export async function getHealthRecordById(
  id: string,
): Promise<HealthRecordDto | null> {
  const record = await prisma.healthRecord.findUnique({ where: { id } });
  return record ? mapHealthRecord(record) : null;
}

export async function deleteHealthRecord(id: string): Promise<void> {
  await prisma.healthRecord.delete({ where: { id } });
}
