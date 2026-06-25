import { DEFAULT_CALIBRATION_THRESHOLD } from "@/lib/ingesta/x-bookmarks/types";
import { processCalibratedAboveThreshold } from "@/lib/ingesta/x-bookmarks/store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json().catch(() => ({}))) as { threshold?: number };
    const threshold =
      typeof body.threshold === "number" && body.threshold >= 1 && body.threshold <= 12
        ? Math.round(body.threshold)
        : DEFAULT_CALIBRATION_THRESHOLD;

    const result = await processCalibratedAboveThreshold(threshold);
    return NextResponse.json({ threshold, ...result });
  } catch (error) {
    console.error("Process x-bookmarks error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo procesar los marcadores.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
