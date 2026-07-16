import { buildCastilloSemanticSnapshot } from "@/lib/castillo/semantic-map";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const snapshot = await buildCastilloSemanticSnapshot(request);
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Castillo semantic map error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo construir el mapa semántico.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
