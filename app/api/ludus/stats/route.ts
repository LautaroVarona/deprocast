import { getLudusWorldStats } from "@/lib/castillo/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const stats = await getLudusWorldStats();
    return NextResponse.json({
      ...stats,
      signalPoints: 0,
    });
  } catch (error) {
    console.error("Ludus stats error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar las estadísticas del Ludus.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
