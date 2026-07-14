import { listArchivoItems } from "@/lib/archivo";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { filterArchivoItemsForUniverse } from "@/lib/babel/universe-refs";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const { items, total } = await listArchivoItems();
    const filtered = await filterArchivoItemsForUniverse(items, universeSlug);
    const sources = filtered.map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      fuenteOrigen: item.fuenteOrigen,
      charCount: item.charCount,
      createdAt: item.createdAt,
      strongestTag: item.strongestTag,
    }));

    return NextResponse.json({
      sources,
      total: filtered.length,
      universe: universeSlug ?? "babel",
    });
  } catch (error) {
    console.error("Molecular sources error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar las fuentes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
