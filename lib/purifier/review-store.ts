import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ADUANA_QUEUE_STATUSES,
  assertPipelineTransition,
  normalizePipelineStatus,
  type PipelineStatus,
} from "@/lib/purifier/pipeline-status";
import type { PurifierReviewRecord } from "@/lib/purifier/types";
import { getRawDocumentsPath } from "@/lib/runtime-paths";
import {
  mkdir,
  readdir,
  readFile,
  unlink,
} from "node:fs/promises";
import path from "node:path";

export const REVIEW_DIR = getRawDocumentsPath("review");

export type ReviewListItem = {
  reviewId: string;
  filename: string;
  title: string;
  processedAt: string;
  assetId?: string;
  pipelineStatus: PipelineStatus;
};

function reviewFilename(reviewId: string): string {
  return `${reviewId}.json`;
}

function withPipelineStatus(
  record: PurifierReviewRecord,
  fallback: PipelineStatus = "pendiente_validacion",
): PurifierReviewRecord {
  return {
    ...record,
    pipelineStatus: normalizePipelineStatus(record.pipelineStatus, fallback),
  };
}

function toListItem(record: PurifierReviewRecord): ReviewListItem {
  const normalized = withPipelineStatus(record);
  return {
    reviewId: normalized.reviewId,
    filename: reviewFilename(normalized.reviewId),
    title: normalized.suggestedDimensions?.title ?? normalized.particula,
    processedAt: normalized.processedAt,
    assetId: normalized.assetId,
    pipelineStatus: normalized.pipelineStatus,
  };
}

function parseReviewRecord(raw: string): PurifierReviewRecord | null {
  try {
    const parsed = JSON.parse(raw) as PurifierReviewRecord;
    if (!parsed.reviewId || parsed.schemaVersion !== "2") {
      return null;
    }
    return withPipelineStatus(parsed);
  } catch {
    return null;
  }
}

function toJsonPayload(record: PurifierReviewRecord): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue;
}

async function upsertReviewRecord(record: PurifierReviewRecord): Promise<void> {
  const normalized = withPipelineStatus(record);
  const title = normalized.suggestedDimensions?.title ?? normalized.particula;
  const payload = toJsonPayload(normalized);

  await prisma.purifierReview.upsert({
    where: { reviewId: normalized.reviewId },
    create: {
      reviewId: normalized.reviewId,
      particula: normalized.particula,
      assetId: normalized.assetId ?? null,
      title,
      pipelineStatus: normalized.pipelineStatus,
      processedAt: new Date(normalized.processedAt),
      payload,
    },
    update: {
      particula: normalized.particula,
      assetId: normalized.assetId ?? null,
      title,
      pipelineStatus: normalized.pipelineStatus,
      processedAt: new Date(normalized.processedAt),
      payload,
    },
  });
}

async function loadLegacyReviewFromDisk(
  reviewId: string,
): Promise<{ record: PurifierReviewRecord; filename: string } | null> {
  await mkdir(REVIEW_DIR, { recursive: true });
  const entries = await readdir(REVIEW_DIR);

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    if (!entry.startsWith(reviewId)) continue;

    const content = await readFile(path.join(REVIEW_DIR, entry), "utf-8");
    const record = parseReviewRecord(content);
    if (!record) continue;

    await upsertReviewRecord(record);
    return { record, filename: entry };
  }

  return null;
}

async function listLegacyReviewsFromDisk(): Promise<ReviewListItem[]> {
  await mkdir(REVIEW_DIR, { recursive: true });
  const entries = await readdir(REVIEW_DIR, { withFileTypes: true });
  const records: ReviewListItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    try {
      const content = await readFile(path.join(REVIEW_DIR, entry.name), "utf-8");
      const parsed = parseReviewRecord(content);
      if (!parsed) continue;
      records.push(toListItem(parsed));
    } catch {
      // skip corrupt files
    }
  }

  return records;
}

async function deleteLegacyReviewFromDisk(reviewId: string): Promise<boolean> {
  await mkdir(REVIEW_DIR, { recursive: true });
  const entries = await readdir(REVIEW_DIR);
  let deleted = false;

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    if (!entry.startsWith(reviewId)) continue;

    await unlink(path.join(REVIEW_DIR, entry));
    deleted = true;
  }

  return deleted;
}

export async function saveReviewRecord(
  record: PurifierReviewRecord,
): Promise<{ filepath: string; reviewId: string }> {
  await upsertReviewRecord(withPipelineStatus(record));

  const filepath = path.join(REVIEW_DIR, reviewFilename(record.reviewId));
  return { filepath, reviewId: record.reviewId };
}

export type ListReviewOptions = {
  /** Por defecto solo la cola de Aduana (`pendiente_validacion`). */
  statuses?: readonly PipelineStatus[];
  includeAll?: boolean;
};

export async function listReviewRecords(
  options: ListReviewOptions = {},
): Promise<ReviewListItem[]> {
  const statuses = options.includeAll
    ? null
    : (options.statuses ?? ADUANA_QUEUE_STATUSES);

  const rows = await prisma.purifierReview.findMany({
    where: statuses ? { pipelineStatus: { in: [...statuses] } } : undefined,
    orderBy: { processedAt: "desc" },
  });

  const byId = new Map<string, ReviewListItem>();

  for (const row of rows) {
    const record = withPipelineStatus(
      row.payload as PurifierReviewRecord,
      normalizePipelineStatus(row.pipelineStatus),
    );
    // Columna DB es fuente de verdad si el payload legacy no tiene status.
    record.pipelineStatus = normalizePipelineStatus(
      row.pipelineStatus,
      record.pipelineStatus,
    );
    if (statuses && !statuses.includes(record.pipelineStatus)) continue;
    byId.set(row.reviewId, toListItem(record));
  }

  // Legacy en disco: solo migrar a la cola si aún no hay fila DB.
  for (const legacy of await listLegacyReviewsFromDisk()) {
    if (byId.has(legacy.reviewId)) continue;
    if (statuses && !statuses.includes(legacy.pipelineStatus)) continue;
    byId.set(legacy.reviewId, legacy);
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime(),
  );
}

export async function getReviewQueueAssetIds(): Promise<string[]> {
  // Incluye en vuelo + cola HITL para no re-purificar el mismo asset.
  const records = await listReviewRecords({
    statuses: [
      "prima_materia",
      "pendiente_purificacion",
      "pendiente_validacion",
    ],
  });
  return records
    .map((record) => record.assetId)
    .filter((id): id is string => Boolean(id));
}

export async function loadReviewRecord(
  reviewId: string,
): Promise<{ record: PurifierReviewRecord; filename: string } | null> {
  const row = await prisma.purifierReview.findUnique({
    where: { reviewId },
  });

  if (row) {
    const record = withPipelineStatus(
      row.payload as PurifierReviewRecord,
      normalizePipelineStatus(row.pipelineStatus),
    );
    record.pipelineStatus = normalizePipelineStatus(
      row.pipelineStatus,
      record.pipelineStatus,
    );
    return {
      record,
      filename: reviewFilename(reviewId),
    };
  }

  return loadLegacyReviewFromDisk(reviewId);
}

export async function updateReviewPipelineStatus(
  reviewId: string,
  nextStatus: PipelineStatus,
  patch?: Partial<PurifierReviewRecord>,
): Promise<PurifierReviewRecord | null> {
  const loaded = await loadReviewRecord(reviewId);
  if (!loaded) return null;

  const current = normalizePipelineStatus(loaded.record.pipelineStatus);
  assertPipelineTransition(current, nextStatus);

  const updated: PurifierReviewRecord = {
    ...loaded.record,
    ...patch,
    reviewId,
    pipelineStatus: nextStatus,
    processedAt: patch?.processedAt ?? new Date().toISOString(),
  };

  await saveReviewRecord(updated);
  return updated;
}

export async function deleteReviewRecord(reviewId: string): Promise<boolean> {
  const existing = await prisma.purifierReview.findUnique({
    where: { reviewId },
  });

  if (existing) {
    await prisma.purifierReview.delete({ where: { reviewId } });
    await deleteLegacyReviewFromDisk(reviewId);
    return true;
  }

  return deleteLegacyReviewFromDisk(reviewId);
}

/** Migra reviews legacy en disco a SQLite (útil en desarrollo local). */
export async function migrateLegacyReviewFilesToDb(): Promise<number> {
  const legacy = await listLegacyReviewsFromDisk();
  let migrated = 0;

  for (const item of legacy) {
    const loaded = await loadLegacyReviewFromDisk(item.reviewId);
    if (loaded) {
      migrated += 1;
    }
  }

  return migrated;
}
