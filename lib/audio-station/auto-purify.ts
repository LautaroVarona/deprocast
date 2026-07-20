import "server-only";

import { resolveAudioAssetGravity } from "@/lib/audio-station/gravity";
import {
  buildOriginAttribution,
  selfActor,
  speakerActor,
} from "@/lib/ingesta/origin";
import { captureAndPurify } from "@/lib/purifier/capture";
import { getReviewQueueAssetIds } from "@/lib/purifier/review-store";
import { prisma } from "@/lib/prisma";

export type AutoPurifyResult =
  | { status: "skipped"; reason: string }
  | { status: "purified"; reviewId: string; captureId: string }
  | { status: "error"; message: string };

export async function autoPurifyAudioAsset(
  assetId: string,
): Promise<AutoPurifyResult> {
  const existingIds = await getReviewQueueAssetIds();
  if (existingIds.includes(assetId)) {
    return { status: "skipped", reason: "already_in_review" };
  }

  const asset = await prisma.audioAsset.findUnique({
    where: { id: assetId },
    include: { transcript: true },
  });

  if (!asset) {
    return { status: "skipped", reason: "asset_not_found" };
  }

  const rawText = asset.transcript?.rawText?.trim();
  if (!rawText) {
    return { status: "skipped", reason: "no_transcript" };
  }

  const title = asset.filename.replace(/\.[^.]+$/, "");
  const gravity = await resolveAudioAssetGravity(asset.id, asset.filename);

  try {
    const result = await captureAndPurify(
      {
        channel: "audio",
        rawText,
        assetId: asset.id,
        filename: asset.filename,
        metadata: {
          estado: asset.status,
          transcritoEl: asset.transcript!.createdAt.toISOString(),
          autoPurify: "true",
        },
        gravity: {
          ...gravity,
          title: gravity.title ?? title,
        },
        origin: buildOriginAttribution({
          channel: "audio",
          actors: [
            selfActor(),
            speakerActor(title, asset.id),
          ],
          meta: { assetId: asset.id, filename: asset.filename },
        }),
      },
      { extractKg: true },
    );

    return {
      status: "purified",
      reviewId: result.reviewId,
      captureId: result.captureId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al purificar automáticamente.";
    console.error(`Auto-purify failed for ${assetId}:`, error);
    return { status: "error", message };
  }
}
