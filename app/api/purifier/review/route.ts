import {
  getReviewQueueAssetIds,
  listReviewRecords,
} from "@/lib/purifier/engine";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const [records, assetIds] = await Promise.all([
      listReviewRecords(),
      getReviewQueueAssetIds(),
    ]);
    return NextResponse.json({ records, assetIds });
  } catch (error) {
    console.error("List review error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los registros de revisión." },
      { status: 500 },
    );
  }
}
