import type {
  ContextEvent,
  ContextEventLink,
  HealthRecord,
} from "@prisma/client";
import type {
  ContextEventDto,
  ContextEventLinkDto,
  EventLinkEntityType,
  EventLinkRole,
  EventPillar,
  EventSource,
  EventStatus,
  HealthRecordDto,
  HealthPillar,
} from "@/lib/events/types";

export function mapContextEventLink(
  link: ContextEventLink,
): ContextEventLinkDto {
  return {
    id: link.id,
    entityType: link.entityType as EventLinkEntityType,
    entityId: link.entityId,
    entityLabel: link.entityLabel,
    linkRole: link.linkRole as EventLinkRole,
    createdAt: link.createdAt.toISOString(),
  };
}

export function mapContextEvent(
  event: ContextEvent & { links?: ContextEventLink[] },
): ContextEventDto {
  return {
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    source: event.source as EventSource,
    sourceRef: event.sourceRef,
    content: event.content,
    structuredData: event.structuredData as Record<string, unknown>,
    pillar: event.pillar as EventPillar,
    status: event.status as EventStatus,
    correlationId: event.correlationId,
    createdAt: event.createdAt.toISOString(),
    links: (event.links ?? []).map(mapContextEventLink),
  };
}

export function mapHealthRecord(record: HealthRecord): HealthRecordDto {
  return {
    id: record.id,
    pillar: record.pillar as HealthPillar,
    occurredAt: record.occurredAt.toISOString(),
    summary: record.summary,
    metrics: record.metrics as Record<string, unknown>,
    sourceEventId: record.sourceEventId,
    createdAt: record.createdAt.toISOString(),
  };
}
