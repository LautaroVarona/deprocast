import { searchArchivo } from "@/lib/archivo";
import type { ArchivoKind } from "@/lib/archivo";
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

    const hits = await searchArchivo(query, {
      kind: kind as ArchivoKind | undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json({ query, hits, total: hits.length });
  } catch (error) {
    console.error("Archivo search error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar la búsqueda.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
