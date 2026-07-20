import { distillIdleChatSessions } from "@/lib/memory/session-distill";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Destila y cierra sesiones de chat idle (default 24h). */
export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json().catch(() => ({}))) as {
      idleHours?: number;
    };
    const idleHours =
      typeof body.idleHours === "number" && body.idleHours > 0
        ? body.idleHours
        : 24;

    const result = await distillIdleChatSessions(idleHours);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Session distill idle error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo destilar sesiones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
