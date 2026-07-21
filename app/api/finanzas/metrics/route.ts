import { computeEcoPulseMetrics } from "@/lib/finanzas/metrics";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const metrics = await computeEcoPulseMetrics();
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Finanzas metrics error:", error);
    return NextResponse.json(
      { error: "No se pudieron calcular las métricas." },
      { status: 500 },
    );
  }
}
