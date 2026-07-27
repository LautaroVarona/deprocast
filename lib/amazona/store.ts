import "server-only";

import {
  assignAmazonAToEventSchema,
  createAmazonAResourceSchema,
  updateAmazonAResourceSchema,
  type AmazonAResourceDto,
  type AssignAmazonAToEventInput,
  type CreateAmazonAResourceInput,
  type UpdateAmazonAResourceInput,
} from "@/lib/amazona/types";
import { isPowerId, type PowerId } from "@/lib/mago/powers";
import { sealKgNodeInUniverse } from "@/lib/personas/universe-seal";
import { prisma } from "@/lib/prisma";
import { ensureOperatorPersonaNode } from "@/lib/yo/operator-node";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

function parsePowerIds(value: unknown): PowerId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PowerId => typeof item === "string" && isPowerId(item));
}

function toDto(row: {
  id: string;
  name: string;
  description: string;
  powerIds: unknown;
  kgNodeId: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AmazonAResourceDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    powerIds: parsePowerIds(row.powerIds),
    kgNodeId: row.kgNodeId,
    projectId: row.projectId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function linkOperatorPossesses(
  operatorId: string,
  resourceNodeId: string,
  resourceName: string,
): Promise<void> {
  const context = `Posee recurso AmazonA · ${resourceName}`;
  await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: operatorId,
        targetNodeId: resourceNodeId,
        relationType: "posee",
      },
    },
    create: {
      sourceNodeId: operatorId,
      targetNodeId: resourceNodeId,
      relationType: "posee",
      context,
      weight: 10,
      confidence: 1,
      reconocido: true,
      metadata: {
        origin: "amazona-observer",
      } as Prisma.InputJsonValue,
    },
    update: {
      context,
      weight: 10,
      confidence: 1,
      reconocido: true,
      metadata: {
        origin: "amazona-observer",
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Alta Observador: recurso + KgNode coagulado anclado al hub Operador.
 */
export async function createAmazonAResource(
  raw: CreateAmazonAResourceInput,
  options?: { universeSlug?: string },
): Promise<AmazonAResourceDto> {
  const input = createAmazonAResourceSchema.parse(raw);
  const uniquePowers = [...new Set(input.powerIds)];

  const operator = await ensureOperatorPersonaNode();
  if (!operator) {
    throw new Error(
      "No hay hub del Operador. Completá el bautismo en /yo antes de cargar AmazonA.",
    );
  }

  const resourceId = randomUUID();
  const primaryName = input.name.trim();

  let kgNode;
  try {
    kgNode = await prisma.kgNode.create({
      data: {
        primaryName,
        type: "recurso",
        aliases: [] as Prisma.InputJsonValue,
        metadata: {
          amazonaResourceId: resourceId,
          powerIds: uniquePowers,
          origin: "amazona-observer",
        } as Prisma.InputJsonValue,
        confidence: 1,
        reconocido: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unique constraint") || message.includes("unique")) {
      throw new Error(
        `Ya existe un nodo recurso «${primaryName}» en el grafo. Elegí otro nombre.`,
      );
    }
    throw error;
  }

  await linkOperatorPossesses(operator.id, kgNode.id, primaryName);
  await sealKgNodeInUniverse(
    kgNode.id,
    options?.universeSlug,
    `AmazonA · ${primaryName}`,
  );

  const row = await prisma.amazonAResource.create({
    data: {
      id: resourceId,
      name: primaryName,
      description: input.description?.trim() ?? "",
      powerIds: uniquePowers as Prisma.InputJsonValue,
      kgNodeId: kgNode.id,
      projectId: input.projectId?.trim() || null,
    },
  });

  return toDto(row);
}

export async function listAmazonAResources(): Promise<AmazonAResourceDto[]> {
  const rows = await prisma.amazonAResource.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDto);
}

export async function getAmazonAResource(
  id: string,
): Promise<AmazonAResourceDto | null> {
  const row = await prisma.amazonAResource.findUnique({ where: { id } });
  return row ? toDto(row) : null;
}

export async function updateAmazonAResource(
  id: string,
  raw: UpdateAmazonAResourceInput,
): Promise<AmazonAResourceDto> {
  const input = updateAmazonAResourceSchema.parse(raw);
  const existing = await prisma.amazonAResource.findUnique({ where: { id } });
  if (!existing) throw new Error("Recurso AmazonA no encontrado.");

  const nextName = input.name?.trim() ?? existing.name;
  const nextDescription =
    input.description !== undefined
      ? input.description.trim()
      : existing.description;
  const nextPowers = input.powerIds
    ? [...new Set(input.powerIds)]
    : parsePowerIds(existing.powerIds);
  const nextProjectId =
    input.projectId === undefined
      ? existing.projectId
      : input.projectId?.trim() || null;

  if (existing.kgNodeId) {
    const node = await prisma.kgNode.findUnique({
      where: { id: existing.kgNodeId },
    });
    if (node) {
      const prevMeta =
        node.metadata && typeof node.metadata === "object" && !Array.isArray(node.metadata)
          ? (node.metadata as Record<string, unknown>)
          : {};
      await prisma.kgNode.update({
        where: { id: node.id },
        data: {
          primaryName: nextName,
          metadata: {
            ...prevMeta,
            amazonaResourceId: id,
            powerIds: nextPowers,
            origin: "amazona-observer",
          } as Prisma.InputJsonValue,
          reconocido: true,
          confidence: 1,
        },
      });
    }
  }

  const row = await prisma.amazonAResource.update({
    where: { id },
    data: {
      name: nextName,
      description: nextDescription,
      powerIds: nextPowers as Prisma.InputJsonValue,
      projectId: nextProjectId,
    },
  });

  return toDto(row);
}

export async function deleteAmazonAResource(id: string): Promise<void> {
  const existing = await prisma.amazonAResource.findUnique({ where: { id } });
  if (!existing) throw new Error("Recurso AmazonA no encontrado.");

  await prisma.amazonAResource.delete({ where: { id } });

  if (existing.kgNodeId) {
    await prisma.kgEdge.deleteMany({
      where: {
        OR: [
          { sourceNodeId: existing.kgNodeId },
          { targetNodeId: existing.kgNodeId },
        ],
      },
    });
    await prisma.kgNode.delete({ where: { id: existing.kgNodeId } }).catch(() => {
      // Nodo ya ausente o FK compartida — no bloquear borrado del inventario.
    });
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Asigna un recurso AmazonA a un ContextEvent (link) o crea un bloque nuevo.
 */
export async function assignAmazonAToCalendar(
  raw: AssignAmazonAToEventInput,
): Promise<{ eventId: string; resourceId: string }> {
  const input = assignAmazonAToEventSchema.parse(raw);
  const resource = await prisma.amazonAResource.findUnique({
    where: { id: input.resourceId },
  });
  if (!resource) throw new Error("Recurso AmazonA no encontrado.");

  let eventId = input.eventId;

  if (!eventId) {
    if (!input.occurredAt) {
      throw new Error("Indicá eventId u occurredAt para asignar el recurso.");
    }
    const durationMin = input.durationMin ?? 30;
    const created = await prisma.contextEvent.create({
      data: {
        occurredAt: input.occurredAt,
        endsAt: addMinutes(input.occurredAt, durationMin),
        durationMin,
        source: "manual",
        content: `AmazonA · ${resource.name}`,
        structuredData: {
          amazonaResourceId: resource.id,
          powerIds: parsePowerIds(resource.powerIds),
        } as Prisma.InputJsonValue,
        pillar: "proyecto",
        status: "confirmed",
        blockKind: "SUGGESTION",
        actionCost: Math.min(12, Math.max(1, parsePowerIds(resource.powerIds).length)),
        executionStatus: "coagulated",
        ecosystemArea: "meta",
      },
    });
    eventId = created.id;
  } else {
    const event = await prisma.contextEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Bloque de calendario no encontrado.");
  }

  const existingLink = await prisma.contextEventLink.findFirst({
    where: {
      eventId,
      entityType: "amazona_resource",
      entityId: resource.id,
    },
  });

  if (!existingLink) {
    await prisma.contextEventLink.create({
      data: {
        eventId,
        entityType: "amazona_resource",
        entityId: resource.id,
        entityLabel: resource.name,
        linkRole: "related",
      },
    });
  }

  return { eventId, resourceId: resource.id };
}
