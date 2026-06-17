import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { IngestResult, MentionSourceType } from "@/lib/kg/types";

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

export type SourceKey = {
  sourceType: MentionSourceType | string;
  sourceId: string;
};

/**
 * Devuelve true si la fuente cambio (o no existia) desde la ultima ingesta.
 */
export async function sourceHasChanged(
  key: SourceKey,
  content: string,
): Promise<boolean> {
  const existing = await prisma.kgSource.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: key.sourceType,
        sourceId: key.sourceId,
      },
    },
  });
  if (!existing) return true;
  return existing.contentHash !== hashContent(content);
}

export async function recordSourceIngestion(
  key: SourceKey,
  content: string,
  counts: { nodeCount?: number; edgeCount?: number; mentionCount?: number },
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const contentHash = hashContent(content);
  await prisma.kgSource.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: key.sourceType,
        sourceId: key.sourceId,
      },
    },
    create: {
      sourceType: key.sourceType,
      sourceId: key.sourceId,
      contentHash,
      nodeCount: counts.nodeCount ?? 0,
      edgeCount: counts.edgeCount ?? 0,
      mentionCount: counts.mentionCount ?? 0,
      metadata: metadata as Prisma.InputJsonValue,
    },
    update: {
      contentHash,
      nodeCount: counts.nodeCount ?? 0,
      edgeCount: counts.edgeCount ?? 0,
      mentionCount: counts.mentionCount ?? 0,
      metadata: metadata as Prisma.InputJsonValue,
      lastIngestedAt: new Date(),
    },
  });
}

export type IngestIfChangedResult = {
  skipped: boolean;
  result?: IngestResult;
};

/**
 * Ejecuta `ingestFn` solo si el contenido de la fuente cambio respecto al
 * hash registrado en KgSource. Permite re-ejecutar el backfill sin reconstruir
 * todo el grafo desde cero.
 */
export async function ingestIfChanged(
  key: SourceKey,
  content: string,
  ingestFn: () => Promise<IngestResult>,
  options: { force?: boolean; metadata?: Record<string, unknown> } = {},
): Promise<IngestIfChangedResult> {
  if (!options.force && !(await sourceHasChanged(key, content))) {
    return { skipped: true };
  }

  const result = await ingestFn();

  await recordSourceIngestion(
    key,
    content,
    {
      nodeCount: result.nodeIds.length,
      edgeCount: result.edgeIds.length,
      mentionCount: result.mentionIds.length,
    },
    options.metadata,
  );

  return { skipped: false, result };
}
