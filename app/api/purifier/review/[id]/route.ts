import { loadReviewRecord } from "@/lib/purifier/engine";
import { resolveReviewMetaTags } from "@/lib/purifier/meta-tags";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { isReviewInUniverse } from "@/lib/babel/universe-refs";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const loaded = await loadReviewRecord(id);

    if (!loaded) {
      return NextResponse.json(
        { error: "Registro de revisión no encontrado." },
        { status: 404 },
      );
    }

    const allowed = await isReviewInUniverse(
      id,
      loaded.record.assetId,
      universeSlug,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Registro no pertenece al universo activo." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      record: {
        ...loaded.record,
        metaTagsSecundarios: resolveReviewMetaTags(loaded.record),
      },
    });
  } catch (error) {
    console.error("Get review error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el registro de revisión." },
      { status: 500 },
    );
  }
}
