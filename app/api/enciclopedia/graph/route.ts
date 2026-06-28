import { buildSessionGraph } from "@/lib/enciclopedia/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const entryIdsParam = request.nextUrl.searchParams.get("entryIds") ?? "";
    const entryIds = entryIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const snapshot = await buildSessionGraph(entryIds);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Enciclopedia graph error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo construir el grafo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
