import { buildCastleCatalog } from "@/lib/castillo/catalog";
import { ensureDefaultGrid } from "@/lib/castillo/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const gridIdParam = request.nextUrl.searchParams.get("gridId");
    const defaultGrid = await ensureDefaultGrid();
    const gridId = gridIdParam ?? defaultGrid.id;
    const catalog = await buildCastleCatalog(gridId);
    return NextResponse.json(catalog);
  } catch (error) {
    console.error("Castillo catalog error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el catálogo del Castillo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
