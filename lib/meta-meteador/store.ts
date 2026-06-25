import "server-only";

import type { Prisma } from "@prisma/client";
import type {
  AreasRelevancia,
  MetaMeteadorProcessTrace,
} from "@/lib/meta-meteador/types";
import { prisma } from "@/lib/prisma";

export type DocumentMetaRow = {
  documentId: string;
  titulo: string;
  tituloLocked: boolean;
  titleApplied: boolean;
  materia: string;
  particula: string;
  campo: string;
  onda: string;
  tiempoEspacio: string;
  posicion: string;
  areas: AreasRelevancia;
  processTrace: MetaMeteadorProcessTrace | null;
  modelUsed: string | null;
  processedAt: Date;
  updatedAt: Date;
};

export async function countDocumentMeta(): Promise<number> {
  return prisma.documentMeta.count();
}

export async function listDocumentMetaIds(): Promise<string[]> {
  const rows = await prisma.documentMeta.findMany({
    select: { documentId: true },
  });
  return rows.map((row) => row.documentId);
}

export async function listDocumentMeta(options?: {
  since?: Date;
}): Promise<DocumentMetaRow[]> {
  const rows = await prisma.documentMeta.findMany({
    where: options?.since ? { processedAt: { gte: options.since } } : undefined,
    orderBy: { processedAt: "desc" },
  });

  return rows.map((row) => ({
    documentId: row.documentId,
    titulo: row.titulo,
    tituloLocked: row.tituloLocked,
    titleApplied: row.titleApplied,
    materia: row.materia,
    particula: row.particula,
    campo: row.campo,
    onda: row.onda,
    tiempoEspacio: row.tiempoEspacio,
    posicion: row.posicion,
    areas: row.areas as AreasRelevancia,
    processTrace: (row.processTrace as MetaMeteadorProcessTrace | null) ?? null,
    modelUsed: row.modelUsed,
    processedAt: row.processedAt,
    updatedAt: row.updatedAt,
  }));
}

export async function getDocumentMeta(
  documentId: string,
): Promise<DocumentMetaRow | null> {
  const row = await prisma.documentMeta.findUnique({
    where: { documentId },
  });
  if (!row) return null;

  return {
    documentId: row.documentId,
    titulo: row.titulo,
    tituloLocked: row.tituloLocked,
    titleApplied: row.titleApplied,
    materia: row.materia,
    particula: row.particula,
    campo: row.campo,
    onda: row.onda,
    tiempoEspacio: row.tiempoEspacio,
    posicion: row.posicion,
    areas: row.areas as AreasRelevancia,
    processTrace: (row.processTrace as MetaMeteadorProcessTrace | null) ?? null,
    modelUsed: row.modelUsed,
    processedAt: row.processedAt,
    updatedAt: row.updatedAt,
  };
}

export async function upsertDocumentMeta(input: {
  documentId: string;
  titulo: string;
  tituloLocked: boolean;
  titleApplied?: boolean;
  materia: string;
  particula: string;
  campo: string;
  onda: string;
  tiempoEspacio: string;
  posicion: string;
  areas: AreasRelevancia;
  processTrace?: MetaMeteadorProcessTrace;
  modelUsed: string;
}): Promise<void> {
  await prisma.documentMeta.upsert({
    where: { documentId: input.documentId },
    create: {
      documentId: input.documentId,
      titulo: input.titulo,
      tituloLocked: input.tituloLocked,
      titleApplied: input.titleApplied ?? false,
      materia: input.materia,
      particula: input.particula,
      campo: input.campo,
      onda: input.onda,
      tiempoEspacio: input.tiempoEspacio,
      posicion: input.posicion,
      areas: input.areas as Prisma.InputJsonValue,
      processTrace: input.processTrace as Prisma.InputJsonValue | undefined,
      modelUsed: input.modelUsed,
    },
    update: {
      titulo: input.titulo,
      tituloLocked: input.tituloLocked,
      ...(input.titleApplied !== undefined
        ? { titleApplied: input.titleApplied }
        : {}),
      materia: input.materia,
      particula: input.particula,
      campo: input.campo,
      onda: input.onda,
      tiempoEspacio: input.tiempoEspacio,
      posicion: input.posicion,
      areas: input.areas as Prisma.InputJsonValue,
      ...(input.processTrace !== undefined
        ? { processTrace: input.processTrace as Prisma.InputJsonValue }
        : {}),
      modelUsed: input.modelUsed,
      processedAt: new Date(),
    },
  });
}

export async function markDocumentMetaTitleApplied(
  documentId: string,
  titulo: string,
): Promise<void> {
  await prisma.documentMeta.update({
    where: { documentId },
    data: {
      titulo,
      titleApplied: true,
      updatedAt: new Date(),
    },
  });
}
