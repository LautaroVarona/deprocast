import { buildCampamentoGeoSnapshot } from "@/lib/geo/campamento-map";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const fromRaw = request.nextUrl.searchParams.get("from");
    const toRaw = request.nextUrl.searchParams.get("to");
    if (!fromRaw || !toRaw) {
      return NextResponse.json(
        { error: "from y to son obligatorios (ISO)." },
        { status: 400 },
      );
    }

    const from = new Date(fromRaw);
    const to = new Date(toRaw);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "from o to inválidos." },
        { status: 400 },
      );
    }

    const snapshot = await buildCampamentoGeoSnapshot({
      from,
      to,
      request,
    });
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Campamento geo error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo construir el mapa geográfico.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
