import { searchArchivo } from "@/lib/archivo";
import type { ArchivoKind } from "@/lib/archivo";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { filterArchivoItemsForUniverse } from "@/lib/babel/universe-refs";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const query = request.nextUrl.searchParams.get("q") ?? "";
    const kind = request.nextUrl.searchParams.get("kind");
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const universeSlug = getUniverseFilterSlugFromRequest(request);

    const hits = await searchArchivo(query, {
      kind: kind as ArchivoKind | undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    const filtered = await filterArchivoItemsForUniverse(hits, universeSlug);

    return NextResponse.json({
      query,
      hits: filtered,
      total: filtered.length,
      universe: universeSlug ?? "babel",
    });
  } catch (error) {
    console.error("Archivo search error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar la búsqueda.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
