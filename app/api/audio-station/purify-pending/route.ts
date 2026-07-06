import { autoPurifyAudioAsset } from "@/lib/audio-station/auto-purify";
import { getReviewQueueAssetIds } from "@/lib/purifier/review-store";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  try {
    await ensureRuntimeReady();

    const existingReviewAssetIds = new Set(await getReviewQueueAssetIds());

    const assets = await prisma.audioAsset.findMany({
      where: { transcript: { isNot: null } },
      select: {
        id: true,
        transcript: { select: { rawText: true } },
      },
    });

    const pendingIds = assets
      .filter(
        (asset) =>
          asset.transcript?.rawText?.trim() &&
          !existingReviewAssetIds.has(asset.id),
      )
      .map((asset) => asset.id);

    const results: Array<{
      assetId: string;
      status: string;
      reviewId?: string;
      reason?: string;
      message?: string;
    }> = [];

    for (const assetId of pendingIds) {
      const result = await autoPurifyAudioAsset(assetId);
      if (result.status === "purified") {
        results.push({
          assetId,
          status: "purified",
          reviewId: result.reviewId,
        });
        existingReviewAssetIds.add(assetId);
      } else if (result.status === "skipped") {
        results.push({ assetId, status: "skipped", reason: result.reason });
      } else {
        results.push({ assetId, status: "error", message: result.message });
      }
    }

    const purified = results.filter((r) => r.status === "purified").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      total: pendingIds.length,
      purified,
      errors,
      results,
    });
  } catch (error) {
    console.error("Purify pending audios error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron purificar los audios pendientes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
