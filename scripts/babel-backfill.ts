/**
 * Indexa materia prima existente en BabelRecord con sello de contexto inferido.
 *
 * Uso: npm run babel:backfill
 */
import "dotenv/config";

import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { ensureRootUniverse } from "@/lib/babel/universe-store";
import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import { prisma, resetPrismaClient } from "@/lib/prisma";

function previewFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.cleanedText,
    record.rawText,
    record.markdownBody,
    record.title,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 200);
    }
  }
  return "";
}

async function backfillPurifierReviews(): Promise<number> {
  const reviews = await prisma.purifierReview.findMany({
    orderBy: { createdAt: "asc" },
  });

  let count = 0;
  for (const review of reviews) {
    const payload =
      review.payload && typeof review.payload === "object" && !Array.isArray(review.payload)
        ? (review.payload as Record<string, unknown>)
        : {};

    const field =
      typeof payload.field === "string" ? payload.field : DEFAULT_CAMPO_SLUG;

    await registerBabelRecord({
      kind: "purifier",
      physicalRef: review.reviewId,
      contentPreview: previewFromPayload(review.payload) || review.title,
      occurredAt: review.processedAt,
      contextSeal: ROOT_UNIVERSE_SLUG,
      campoSlug: field,
      channel: "purifier",
      metadata: { reviewId: review.reviewId, particula: review.particula },
    });
    count += 1;
  }

  return count;
}

async function backfillAudioAssets(): Promise<number> {
  const assets = await prisma.audioAsset.findMany({
    include: { transcript: true },
    orderBy: { originalCreatedAt: "asc" },
  });

  let count = 0;
  for (const asset of assets) {
    await registerBabelRecord({
      kind: "audio",
      physicalRef: asset.id,
      contentPreview: asset.transcript?.rawText?.slice(0, 200) ?? asset.filename,
      occurredAt: asset.originalCreatedAt,
      contextSeal: ROOT_UNIVERSE_SLUG,
      campoSlug: DEFAULT_CAMPO_SLUG,
      channel: "audio",
      metadata: { filename: asset.filename, status: asset.status },
    });
    count += 1;
  }

  return count;
}

async function backfillPendingTasks(): Promise<number> {
  const tasks = await prisma.pendingTask.findMany({
    where: { universeSlug: null },
  });

  let count = 0;
  for (const task of tasks) {
    await prisma.pendingTask.update({
      where: { id: task.id },
      data: { universeSlug: ROOT_UNIVERSE_SLUG },
    });
    count += 1;
  }

  return count;
}

async function backfillXBookmarks(): Promise<number> {
  const bookmarks = await prisma.xBookmark.findMany({
    orderBy: { createdAt: "asc" },
  });

  let count = 0;
  for (const bookmark of bookmarks) {
    await registerBabelRecord({
      kind: "bookmark",
      physicalRef: bookmark.id,
      contentPreview: bookmark.text.slice(0, 200),
      occurredAt: bookmark.createdAt,
      contextSeal: ROOT_UNIVERSE_SLUG,
      campoSlug: DEFAULT_CAMPO_SLUG,
      channel: "x-bookmarks",
      metadata: { handle: bookmark.handle },
    });
    count += 1;
  }

  return count;
}

async function main() {
  await ensureRootUniverse();

  const [reviews, audio, tasks, bookmarks] = await Promise.all([
    backfillPurifierReviews(),
    backfillAudioAssets(),
    backfillPendingTasks(),
    backfillXBookmarks(),
  ]);

  console.log("Babel backfill completado:");
  console.log(`  PurifierReview → BabelRecord: ${reviews}`);
  console.log(`  AudioAsset → BabelRecord: ${audio}`);
  console.log(`  PendingTask.universeSlug: ${tasks}`);
  console.log(`  XBookmark → BabelRecord: ${bookmarks}`);

  await prisma.$disconnect();
  resetPrismaClient();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
