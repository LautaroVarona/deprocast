import "server-only";

import { prisma } from "@/lib/prisma";
import {
  emptyExtraction,
  parseExtractionState,
  parseMessages,
  type IncubationExtraction,
  type IncubationMessage,
  type IncubationSessionStatus,
} from "@/lib/projects/incubation/schema";
import type { Prisma } from "@prisma/client";

export type IncubationSessionDto = {
  id: string;
  status: IncubationSessionStatus;
  messages: IncubationMessage[];
  extractionState: IncubationExtraction;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: {
  id: string;
  status: string;
  messages: unknown;
  extractionState: unknown;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): IncubationSessionDto {
  return {
    id: row.id,
    status: row.status as IncubationSessionStatus,
    messages: parseMessages(row.messages),
    extractionState: parseExtractionState(row.extractionState),
    projectId: row.projectId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createIncubationSession(
  initialMessages: IncubationMessage[] = [],
): Promise<IncubationSessionDto> {
  const row = await prisma.projectIncubationSession.create({
    data: {
      status: "active",
      messages: initialMessages as unknown as Prisma.InputJsonValue,
      extractionState: emptyExtraction() as unknown as Prisma.InputJsonValue,
    },
  });
  return mapRow(row);
}

export async function getIncubationSession(
  id: string,
): Promise<IncubationSessionDto | null> {
  const row = await prisma.projectIncubationSession.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function appendIncubationMessages(
  id: string,
  newMessages: IncubationMessage[],
  extractionState: IncubationExtraction,
): Promise<IncubationSessionDto> {
  const existing = await getIncubationSession(id);
  if (!existing) {
    throw new Error("Sesión de incubación no encontrada.");
  }
  if (existing.status !== "active") {
    throw new Error("La sesión ya no está activa.");
  }

  const messages = [...existing.messages, ...newMessages];
  const row = await prisma.projectIncubationSession.update({
    where: { id },
    data: {
      messages: messages as unknown as Prisma.InputJsonValue,
      extractionState: extractionState as unknown as Prisma.InputJsonValue,
    },
  });
  return mapRow(row);
}

export async function markIncubationConsolidated(
  id: string,
  projectId: string,
): Promise<IncubationSessionDto> {
  const row = await prisma.projectIncubationSession.update({
    where: { id },
    data: {
      status: "consolidated",
      projectId,
    },
  });
  return mapRow(row);
}
