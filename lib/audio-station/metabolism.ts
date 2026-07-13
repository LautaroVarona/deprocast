import "server-only";

import { prisma } from "@/lib/prisma";
import { loadReviewRecord } from "@/lib/purifier/review-store";

export type MetabolismTaskSummary = {
  id: string;
  title: string;
  status: string;
  targetDay: string;
};

export type MetabolismEventSummary = {
  id: string;
  content: string;
  occurredAt: string;
  pillar: string;
};

export type AssetMetabolismSummary = {
  assetId: string;
  reviewId: string | null;
  taskCount: number;
  tasks: MetabolismTaskSummary[];
  eventCount: number;
  events: MetabolismEventSummary[];
  chunkCount: number;
  tagCount: number;
  tags: string[];
  nodeCount: number;
};

export async function getMetabolismByAssetIds(
  assetIds: string[],
  reviewByAssetId: Map<string, string>,
): Promise<Record<string, AssetMetabolismSummary>> {
  if (assetIds.length === 0) return {};

  const reviewIds = [...new Set(reviewByAssetId.values())];

  const [tasks, events, transcripts] = await Promise.all([
    reviewIds.length > 0
      ? prisma.pendingTask.findMany({
          where: { reviewId: { in: reviewIds } },
          select: {
            id: true,
            title: true,
            status: true,
            targetDay: true,
            reviewId: true,
          },
        })
      : [],
    reviewIds.length > 0
      ? prisma.contextEvent.findMany({
          where: {
            source: "audio",
            sourceRef: { in: reviewIds },
          },
          select: {
            id: true,
            content: true,
            occurredAt: true,
            pillar: true,
            sourceRef: true,
          },
        })
      : [],
    prisma.transcript.findMany({
      where: { assetId: { in: assetIds } },
      select: {
        assetId: true,
        _count: { select: { parentChunks: true } },
      },
    }),
  ]);

  const tasksByReview = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.reviewId) continue;
    const list = tasksByReview.get(task.reviewId) ?? [];
    list.push(task);
    tasksByReview.set(task.reviewId, list);
  }

  const eventsByReview = new Map<string, typeof events>();
  for (const event of events) {
    if (!event.sourceRef) continue;
    const list = eventsByReview.get(event.sourceRef) ?? [];
    list.push(event);
    eventsByReview.set(event.sourceRef, list);
  }

  const chunksByAsset = new Map(
    transcripts.map((row) => [row.assetId, row._count.parentChunks]),
  );

  const result: Record<string, AssetMetabolismSummary> = {};

  for (const assetId of assetIds) {
    const reviewId = reviewByAssetId.get(assetId) ?? null;
    const assetTasks = reviewId ? (tasksByReview.get(reviewId) ?? []) : [];
    const assetEvents = reviewId ? (eventsByReview.get(reviewId) ?? []) : [];

    let tags: string[] = [];
    let nodeCount = 0;

    if (reviewId) {
      const loaded = await loadReviewRecord(reviewId);
      if (loaded) {
        tags = loaded.record.metaTagsSecundarios ?? [];
        const kg = loaded.record.kgExtraction;
        if (kg) {
          nodeCount =
            (kg.entities?.length ?? 0) + (kg.relations?.length ?? 0);
        }
      }
    }

    result[assetId] = {
      assetId,
      reviewId,
      taskCount: assetTasks.length,
      tasks: assetTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        targetDay: task.targetDay.toISOString(),
      })),
      eventCount: assetEvents.length,
      events: assetEvents.map((event) => ({
        id: event.id,
        content: event.content,
        occurredAt: event.occurredAt.toISOString(),
        pillar: event.pillar,
      })),
      chunkCount: chunksByAsset.get(assetId) ?? 0,
      tagCount: tags.length,
      tags: tags.slice(0, 8),
      nodeCount,
    };
  }

  return result;
}
