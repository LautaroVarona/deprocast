import { getLudusWorldStats, unlockStatue } from "@/lib/ludus/service";
import { LUDUS_STATUES } from "@/lib/ludus/constants";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const stats = await getLudusWorldStats();
    return NextResponse.json({
      statues: LUDUS_STATUES.map((statue) => ({
        ...statue,
        unlocked: stats.unlockedStatues.includes(statue.id),
      })),
      signalPoints: stats.signalPoints,
    });
  } catch (error) {
    console.error("Ludus statues GET error:", error);
    return NextResponse.json({ error: "Error al cargar estatuas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as { statueId?: string };
    if (!body.statueId) {
      return NextResponse.json({ error: "statueId requerido." }, { status: 400 });
    }
    const stats = await unlockStatue(body.statueId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Ludus statues POST error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo desbloquear.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
