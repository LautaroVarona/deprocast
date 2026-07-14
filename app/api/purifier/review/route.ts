import {
  getReviewQueueAssetIds,
  listReviewRecords,
} from "@/lib/purifier/engine";
import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { filterReviewRecordsForUniverse } from "@/lib/babel/universe-refs";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const universeSlug = resolveContextSealFromRequest(request);
    const [allRecords, allAssetIds] = await Promise.all([
      listReviewRecords(),
      getReviewQueueAssetIds(),
    ]);

    const records = await filterReviewRecordsForUniverse(
      allRecords,
      shouldFilterByUniverse(universeSlug) ? universeSlug : undefined,
    );
    const allowedAssetIds = new Set(
      records
        .map((record) => record.assetId)
        .filter((id): id is string => Boolean(id)),
    );
    const assetIds = allAssetIds.filter((id) => allowedAssetIds.has(id));

    return NextResponse.json({
      records,
      assetIds,
      universe: universeSlug,
    });
  } catch (error) {
    console.error("List review error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los registros de revisión." },
      { status: 500 },
    );
  }
}
