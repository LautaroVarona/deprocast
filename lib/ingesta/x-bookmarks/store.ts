import { mockEnrichXBookmark } from "@/lib/ingesta/x-bookmarks/enrich";
import { ingestXBookmark } from "@/lib/kg/sources";
import type {
  XBookmarkImportResult,
  XBookmarkProcessResult,
  XBookmarkRecord,
  XBookmarkStatus,
  XBookmarkTweet,
} from "@/lib/ingesta/x-bookmarks/types";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

function parseJsonStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

function toRecord(row: {
  id: string;
  externalId: string | null;
  author: string;
  handle: string;
  text: string;
  mediaUrls: unknown;
  tweetUrl: string | null;
  bookmarkedAt: string | null;
  weight: number | null;
  calibratedAt: Date | null;
  titleEs: string | null;
  metaTags: unknown;
  linkedProjects: unknown;
  enrichedAt: Date | null;
  importBatchId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): XBookmarkRecord {
  return {
    id: row.id,
    externalId: row.externalId ?? undefined,
    author: row.author,
    handle: row.handle,
    text: row.text,
    mediaUrls: parseJsonStringArray(row.mediaUrls) ?? [],
    tweetUrl: row.tweetUrl ?? undefined,
    bookmarkedAt: row.bookmarkedAt ?? undefined,
    weight: row.weight,
    calibratedAt: row.calibratedAt?.toISOString() ?? null,
    titleEs: row.titleEs,
    metaTags: parseJsonStringArray(row.metaTags),
    linkedProjects: parseJsonStringArray(row.linkedProjects),
    enrichedAt: row.enrichedAt?.toISOString() ?? null,
    importBatchId: row.importBatchId,
    status: row.status as XBookmarkStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function importXBookmarks(
  tweets: XBookmarkTweet[],
): Promise<XBookmarkImportResult> {
  const importBatchId = randomUUID();
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const tweet of tweets) {
    if (tweet.externalId) {
      const existing = await prisma.xBookmark.findFirst({
        where: { externalId: tweet.externalId },
        select: { id: true, status: true },
      });
      if (existing) {
        if (existing.status === "pending") {
          await prisma.xBookmark.update({
            where: { id: existing.id },
            data: {
              author: tweet.author,
              handle: tweet.handle,
              text: tweet.text,
              mediaUrls: tweet.mediaUrls,
              tweetUrl: tweet.tweetUrl ?? null,
              bookmarkedAt: tweet.bookmarkedAt ?? null,
              importBatchId,
            },
          });
          updated += 1;
        } else {
          skipped += 1;
        }
        continue;
      }
    }

    await prisma.xBookmark.create({
      data: {
        externalId: tweet.externalId ?? null,
        author: tweet.author,
        handle: tweet.handle,
        text: tweet.text,
        mediaUrls: tweet.mediaUrls,
        tweetUrl: tweet.tweetUrl ?? null,
        bookmarkedAt: tweet.bookmarkedAt ?? null,
        importBatchId,
        status: "pending",
      },
    });
    imported += 1;
  }

  return { importBatchId, imported, updated, skipped };
}

export async function listPendingXBookmarks(limit = 10_000): Promise<XBookmarkRecord[]> {
  const rows = await prisma.xBookmark.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows.map(toRecord);
}

export async function listXBookmarks(filters?: {
  status?: XBookmarkStatus;
  minWeight?: number;
  importBatchId?: string;
}): Promise<XBookmarkRecord[]> {
  const where: Prisma.XBookmarkWhereInput = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.importBatchId) where.importBatchId = filters.importBatchId;
  if (filters?.minWeight !== undefined) {
    where.weight = { gte: filters.minWeight };
  }

  const rows = await prisma.xBookmark.findMany({
    where,
    orderBy: [{ weight: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return rows.map(toRecord);
}

export async function calibrateXBookmark(
  id: string,
  weight: number,
): Promise<XBookmarkRecord> {
  const row = await prisma.xBookmark.update({
    where: { id },
    data: {
      weight,
      calibratedAt: new Date(),
      status: "calibrated",
    },
  });
  return toRecord(row);
}

export async function processCalibratedAboveThreshold(
  threshold: number,
): Promise<XBookmarkProcessResult> {
  const candidates = await prisma.xBookmark.findMany({
    where: {
      status: "calibrated",
      weight: { gte: threshold },
    },
    orderBy: { calibratedAt: "asc" },
  });

  const enriched: XBookmarkRecord[] = [];
  let kgIngested = 0;

  for (const row of candidates) {
    const enrichment = await mockEnrichXBookmark({
      externalId: row.externalId ?? undefined,
      author: row.author,
      handle: row.handle,
      text: row.text,
      mediaUrls: parseJsonStringArray(row.mediaUrls) ?? [],
      tweetUrl: row.tweetUrl ?? undefined,
      bookmarkedAt: row.bookmarkedAt ?? undefined,
    });

    const updated = await prisma.xBookmark.update({
      where: { id: row.id },
      data: {
        titleEs: enrichment.titleEs,
        metaTags: enrichment.metaTags,
        linkedProjects: enrichment.linkedProjects,
        enrichedAt: new Date(),
        status: "enriched",
      },
    });
    const record = toRecord(updated);
    enriched.push(record);

    try {
      const summary = await ingestXBookmark(record);
      if (!summary.skipped) {
        kgIngested += 1;
      }
    } catch (error) {
      console.error("KG bookmark hook error:", error);
    }
  }

  await prisma.xBookmark.updateMany({
    where: {
      status: "calibrated",
      weight: { lt: threshold },
    },
    data: { status: "below_threshold" },
  });

  return { processed: enriched.length, enriched, kgIngested };
}

export async function countXBookmarksByStatus(): Promise<Record<string, number>> {
  const groups = await prisma.xBookmark.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return groups.reduce<Record<string, number>>((acc, group) => {
    acc[group.status] = group._count._all;
    return acc;
  }, {});
}
