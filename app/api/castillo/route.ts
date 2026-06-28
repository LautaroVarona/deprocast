import {
  getCastleSnapshot,
  listGrids,
} from "@/lib/castillo/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const gridId = request.nextUrl.searchParams.get("gridId") ?? undefined;
    const snapshot = await getCastleSnapshot(gridId);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Castillo snapshot error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el Castillo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function HEAD() {
  try {
    await ensureRuntimeReady();
    await listGrids();
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
