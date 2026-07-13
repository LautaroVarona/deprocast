import { getMetabolismByAssetIds } from "@/lib/audio-station/metabolism";
import { listReviewRecords } from "@/lib/purifier/review-store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("assetIds");
    const assetIds = idsParam
      ? idsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    if (assetIds.length === 0) {
      return NextResponse.json({ byAssetId: {} });
    }

    const reviews = await listReviewRecords();
    const reviewByAssetId = new Map<string, string>();
    for (const record of reviews) {
      if (record.assetId) {
        reviewByAssetId.set(record.assetId, record.reviewId);
      }
    }

    const byAssetId = await getMetabolismByAssetIds(assetIds, reviewByAssetId);

    return NextResponse.json({ byAssetId });
  } catch (error) {
    console.error("Metabolism API error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la metabolización.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
