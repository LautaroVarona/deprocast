import "server-only";

import { shouldFilterByUniverse } from "@/lib/babel/context-seal";
import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { ensureRootUniverse } from "@/lib/babel/universe-store";
import type {
  BabelRecordDto,
  ListBabelRecordsInput,
  RegisterBabelRecordInput,
} from "@/lib/babel/types";
import { dayRangeForOffset } from "@/lib/pendientes/day";
import { prisma } from "@/lib/prisma";
import type { BabelRecord, Prisma } from "@prisma/client";

function mapRecord(row: BabelRecord): BabelRecordDto {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    kind: row.kind,
    physicalRef: row.physicalRef,
    contentPreview: row.contentPreview,
    occurredAt: row.occurredAt.toISOString(),
    contextSeal: row.contextSeal,
    campoSlug: row.campoSlug,
    channel: row.channel,
    metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function previewText(text: string, max = 200): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

/** Registra materia prima en el plano raíz Babel con sello de contexto. */
export async function registerBabelRecord(
  input: RegisterBabelRecordInput,
): Promise<BabelRecordDto> {
  await ensureRootUniverse();

  const contextSeal = input.contextSeal || ROOT_UNIVERSE_SLUG;

  const universe = await prisma.universe.findUnique({
    where: { slug: contextSeal },
  });
  if (!universe) {
    throw new Error(`Universo "${contextSeal}" no encontrado.`);
  }

  const occurredAt = input.occurredAt ?? new Date();
  const contentPreview = input.contentPreview
    ? previewText(input.contentPreview)
    : "";

  const existing = await prisma.babelRecord.findFirst({
    where: {
      kind: input.kind,
      physicalRef: input.physicalRef,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const row = await prisma.babelRecord.update({
      where: { id: existing.id },
      data: {
        contentPreview: contentPreview || existing.contentPreview,
        occurredAt,
        contextSeal,
        campoSlug: input.campoSlug ?? existing.campoSlug,
        channel: input.channel ?? existing.channel,
        metadata: (input.metadata ?? existing.metadata) as Prisma.InputJsonValue,
      },
    });
    return mapRecord(row);
  }

  const row = await prisma.babelRecord.create({
    data: {
      kind: input.kind,
      physicalRef: input.physicalRef,
      contentPreview,
      occurredAt,
      contextSeal,
      campoSlug: input.campoSlug ?? null,
      channel: input.channel ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return mapRecord(row);
}

export async function listBabelRecords(
  input: ListBabelRecordsInput = {},
): Promise<BabelRecordDto[]> {
  await ensureRootUniverse();

  const where: Prisma.BabelRecordWhereInput = {};

  if (input.universeSlug && shouldFilterByUniverse(input.universeSlug)) {
    where.contextSeal = input.universeSlug;
  }

  if (input.day) {
    const { start, end } = dayRangeForOffset(input.day);
    where.occurredAt = { gte: start, lt: end };
  }

  const rows = await prisma.babelRecord.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: input.limit ?? 50,
  });

  return rows.map(mapRecord);
}
