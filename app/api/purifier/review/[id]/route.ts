import { loadReviewRecord } from "@/lib/purifier/engine";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const loaded = await loadReviewRecord(id);

    if (!loaded) {
      return NextResponse.json(
        { error: "Registro de revisión no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ record: loaded.record });
  } catch (error) {
    console.error("Get review error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el registro de revisión." },
      { status: 500 },
    );
  }
}
