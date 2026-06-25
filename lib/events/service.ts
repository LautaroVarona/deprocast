import "server-only";

import { mapContextEvent, mapHealthRecord } from "@/lib/events/mappers";
import type {
  ContextEventDto,
  CreateProposedEventsInput,
  EventLinkInput,
  EventPillar,
  HealthPillar,
  HealthRecordDto,
} from "@/lib/events/types";
import {
  createProposedEventsInputSchema,
  HEALTH_PILLARS,
  isHealthPillar,
  validateHealthMetrics,
} from "@/lib/events/types";
import { addProgressEntry } from "@/lib/projects/service";
import { ingestHealthEvent } from "@/lib/kg/sources/health";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";

function isHealthPillarValue(pillar: EventPillar): pillar is HealthPillar {
  return HEALTH_PILLARS.includes(pillar as HealthPillar);
}

function buildSummaryFromEvent(
  content: string,
  structuredData: Record<string, unknown>,
): string {
  if (typeof structuredData.summary === "string" && structuredData.summary.trim()) {
    return structuredData.summary.trim();
  }
  return content.trim().slice(0, 200);
}

async function writeHealthFromEvent(
  event: {
    id: string;
    pillar: string;
    occurredAt: Date;
    content: string;
    structuredData: unknown;
  },
): Promise<HealthRecordDto> {
  if (!isHealthPillar(event.pillar)) {
    throw new Error(`El pilar ${event.pillar} no corresponde a telemetría de salud.`);
  }

  const rawMetrics =
    (event.structuredData as Record<string, unknown>).metrics ??
    event.structuredData;
  const metrics = validateHealthMetrics(event.pillar, rawMetrics);
  const summary = buildSummaryFromEvent(
    event.content,
    event.structuredData as Record<string, unknown>,
  );

  const record = await prisma.healthRecord.create({
    data: {
      pillar: event.pillar,
      occurredAt: event.occurredAt,
      summary,
      metrics: metrics as Prisma.InputJsonValue,
      sourceEventId: event.id,
    },
  });

  return mapHealthRecord(record);
}

async function writeProjectFromEvent(
  event: {
    content: string;
    occurredAt: Date;
    structuredData: unknown;
  },
  links: Array<{
    entityType: string;
    entityId: string;
    entityLabel: string | null;
  }>,
): Promise<void> {
  const projectLink = links.find((link) => link.entityType === "proyecto");
  if (!projectLink) {
    throw new Error("No hay vínculo de proyecto para confirmar este evento.");
  }

  const structured = event.structuredData as Record<string, unknown>;
  const nota =
    (typeof structured.note === "string" && structured.note.trim()) ||
    (typeof structured.summary === "string" && structured.summary.trim()) ||
    event.content.trim();

  await addProgressEntry({
    projectId: projectLink.entityId,
    nota,
    fecha: event.occurredAt.toISOString().slice(0, 10),
  });
}

export async function createProposedEvents(
  input: CreateProposedEventsInput,
): Promise<ContextEventDto[]> {
  const parsed = createProposedEventsInputSchema.parse(input);
  const correlationId = parsed.correlationId ?? randomUUID();

  const created = await prisma.$transaction(async (tx) => {
    const events = [];

    for (const item of parsed.events) {
      const contentHash = createHash("sha256")
        .update(
          `${parsed.source}|${parsed.sourceRef ?? ""}|${item.pillar}|${item.content}`,
        )
        .digest("hex")
        .slice(0, 16);

      const existing = await tx.contextEvent.findFirst({
        where: {
          source: parsed.source,
          sourceRef: parsed.sourceRef ?? null,
          pillar: item.pillar,
          content: item.content,
        },
      });

      if (existing) {
        const withLinks = await tx.contextEvent.findUnique({
          where: { id: existing.id },
          include: { links: true },
        });
        if (withLinks) events.push(withLinks);
        continue;
      }

      const structuredData = {
        ...item.structuredData,
        ...(item.summary ? { summary: item.summary } : {}),
        _contentHash: contentHash,
      };

      const event = await tx.contextEvent.create({
        data: {
          occurredAt: parsed.occurredAt,
          source: parsed.source,
          sourceRef: parsed.sourceRef,
          content: item.content,
          structuredData: structuredData as Prisma.InputJsonValue,
          pillar: item.pillar,
          status: "proposed",
          correlationId,
          links: {
            create: item.links.map((link: EventLinkInput) => ({
              entityType: link.entityType,
              entityId: link.entityId,
              entityLabel: link.entityLabel,
              linkRole: link.linkRole ?? "primary",
            })),
          },
        },
        include: { links: true },
      });

      events.push(event);
    }

    return events;
  });

  return created.map(mapContextEvent);
}

export async function createConfirmedManualHealthEvent(input: {
  pillar: HealthPillar;
  occurredAt: Date;
  content: string;
  summary: string;
  metrics: Record<string, unknown>;
}): Promise<{ event: ContextEventDto; record: HealthRecordDto }> {
  const metrics = validateHealthMetrics(input.pillar, input.metrics);

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.contextEvent.create({
      data: {
        occurredAt: input.occurredAt,
        source: "manual",
        content: input.content,
        structuredData: { summary: input.summary, metrics } as Prisma.InputJsonValue,
        pillar: input.pillar,
        status: "confirmed",
        links: {
          create: {
            entityType: "health_pillar",
            entityId: input.pillar,
            entityLabel: input.pillar,
            linkRole: "primary",
          },
        },
      },
      include: { links: true },
    });

    const record = await tx.healthRecord.create({
      data: {
        pillar: input.pillar,
        occurredAt: input.occurredAt,
        summary: input.summary,
        metrics: metrics as Prisma.InputJsonValue,
        sourceEventId: event.id,
      },
    });

    return {
      event: mapContextEvent(event),
      record: mapHealthRecord(record),
    };
  });

  void ingestConfirmedEventToKg({
    id: result.event.id,
    pillar: result.event.pillar,
    content: result.event.content,
    occurredAt: new Date(result.event.occurredAt),
    structuredData: result.event.structuredData,
    links: result.event.links,
  }).catch((error) => {
    console.error("KG health event hook error:", error);
  });

  return result;
}

async function ingestConfirmedEventToKg(event: {
  id: string;
  pillar: string;
  content: string;
  occurredAt: Date;
  structuredData: unknown;
  links: Array<{ entityType: string; entityId: string }>;
}): Promise<void> {
  const projectIds = event.links
    .filter((l) => l.entityType === "proyecto")
    .map((l) => l.entityId);

  await ingestHealthEvent({
    eventId: event.id,
    pillar: event.pillar,
    summary: buildSummaryFromEvent(
      event.content,
      event.structuredData as Record<string, unknown>,
    ),
    content: event.content,
    occurredAt: event.occurredAt,
    projectEntityIds: projectIds,
  });
}

export async function confirmEvent(eventId: string): Promise<ContextEventDto> {
  const event = await prisma.contextEvent.findUnique({
    where: { id: eventId },
    include: { links: true },
  });

  if (!event) {
    throw new Error("Evento no encontrado.");
  }

  if (event.status === "confirmed") {
    return mapContextEvent(event);
  }

  if (event.status === "rejected") {
    throw new Error("No se puede confirmar un evento rechazado.");
  }

  if (event.pillar === "proyecto") {
    await writeProjectFromEvent(event, event.links);
  } else if (isHealthPillarValue(event.pillar as EventPillar)) {
    await writeHealthFromEvent(event);
  }

  void ingestConfirmedEventToKg({
    id: event.id,
    pillar: event.pillar,
    content: event.content,
    occurredAt: event.occurredAt,
    structuredData: event.structuredData,
    links: event.links,
  }).catch((error) => {
    console.error("KG health event hook error:", error);
  });

  const updated = await prisma.contextEvent.update({
    where: { id: eventId },
    data: { status: "confirmed" },
    include: { links: true },
  });

  return mapContextEvent(updated);
}

export async function confirmEvents(eventIds: string[]): Promise<ContextEventDto[]> {
  const results: ContextEventDto[] = [];
  for (const eventId of eventIds) {
    results.push(await confirmEvent(eventId));
  }
  return results;
}

export async function rejectEvent(eventId: string): Promise<ContextEventDto> {
  const updated = await prisma.contextEvent.update({
    where: { id: eventId },
    data: { status: "rejected" },
    include: { links: true },
  });
  return mapContextEvent(updated);
}

export async function getEventById(eventId: string): Promise<ContextEventDto | null> {
  const event = await prisma.contextEvent.findUnique({
    where: { id: eventId },
    include: { links: true },
  });
  return event ? mapContextEvent(event) : null;
}

export async function listEventsBySource(
  source: string,
  sourceRef: string,
  status?: string,
): Promise<ContextEventDto[]> {
  const events = await prisma.contextEvent.findMany({
    where: {
      source,
      sourceRef,
      ...(status ? { status } : {}),
    },
    include: { links: true },
    orderBy: { occurredAt: "desc" },
  });
  return events.map(mapContextEvent);
}

export async function listEventsByEntity(
  entityType: string,
  entityId: string,
  options?: { from?: Date; to?: Date; status?: string },
): Promise<ContextEventDto[]> {
  const events = await prisma.contextEvent.findMany({
    where: {
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.from || options?.to
        ? {
            occurredAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
      links: {
        some: {
          entityType,
          entityId,
        },
      },
    },
    include: { links: true },
    orderBy: { occurredAt: "desc" },
  });
  return events.map(mapContextEvent);
}

export async function listProposedEventsByCorrelation(
  correlationId: string,
): Promise<ContextEventDto[]> {
  const events = await prisma.contextEvent.findMany({
    where: { correlationId, status: "proposed" },
    include: { links: true },
    orderBy: { createdAt: "asc" },
  });
  return events.map(mapContextEvent);
}
