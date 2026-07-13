import { globalSearch } from "@/lib/navigation/global-search";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const query = request.nextUrl.searchParams.get("q") ?? "";
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const results = await globalSearch({
      query,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json({
      query,
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("Global search error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar la búsqueda global.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
