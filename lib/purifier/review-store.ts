import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
};

function reviewFilename(reviewId: string): string {
  return `${reviewId}.json`;
}

function toListItem(record: PurifierReviewRecord): ReviewListItem {
  return {
    reviewId: record.reviewId,
    filename: reviewFilename(record.reviewId),
    title: record.suggestedDimensions?.title ?? record.particula,
    processedAt: record.processedAt,
    assetId: record.assetId,
  };
}

function parseReviewRecord(raw: string): PurifierReviewRecord | null {
  try {
    const parsed = JSON.parse(raw) as PurifierReviewRecord;
    if (!parsed.reviewId || parsed.schemaVersion !== "2") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function toJsonPayload(record: PurifierReviewRecord): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue;
}

async function upsertReviewRecord(record: PurifierReviewRecord): Promise<void> {
  const title = record.suggestedDimensions?.title ?? record.particula;
  const payload = toJsonPayload(record);

  await prisma.purifierReview.upsert({
    where: { reviewId: record.reviewId },
    create: {
      reviewId: record.reviewId,
      particula: record.particula,
      assetId: record.assetId ?? null,
      title,
      processedAt: new Date(record.processedAt),
      payload,
    },
    update: {
      particula: record.particula,
      assetId: record.assetId ?? null,
      title,
      processedAt: new Date(record.processedAt),
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
  await upsertReviewRecord(record);

  const filepath = path.join(REVIEW_DIR, reviewFilename(record.reviewId));
  return { filepath, reviewId: record.reviewId };
}

export async function listReviewRecords(): Promise<ReviewListItem[]> {
  const rows = await prisma.purifierReview.findMany({
    orderBy: { processedAt: "desc" },
  });

  const byId = new Map<string, ReviewListItem>();

  for (const row of rows) {
    const record = row.payload as PurifierReviewRecord;
    byId.set(row.reviewId, toListItem(record));
  }

  for (const legacy of await listLegacyReviewsFromDisk()) {
    if (!byId.has(legacy.reviewId)) {
      byId.set(legacy.reviewId, legacy);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime(),
  );
}

export async function getReviewQueueAssetIds(): Promise<string[]> {
  const records = await listReviewRecords();
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
    return {
      record: row.payload as PurifierReviewRecord,
      filename: reviewFilename(reviewId),
    };
  }

  return loadLegacyReviewFromDisk(reviewId);
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
