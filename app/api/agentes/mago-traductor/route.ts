import { runMagoTraductor } from "@/lib/agentes/mago-traductor";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as {
      mentalRam?: number;
      localFirst?: boolean;
      urgency?: "low" | "medium" | "high" | "critical";
      intent?: string;
      stackHints?: string[];
    };

    if (!body.intent?.trim()) {
      return NextResponse.json(
        { error: "Se requiere intent." },
        { status: 400 },
      );
    }

    const guide = await runMagoTraductor({
      mentalRam: body.mentalRam ?? 6,
      localFirst: body.localFirst !== false,
      urgency: body.urgency ?? "medium",
      intent: body.intent,
      stackHints: body.stackHints,
    });

    return NextResponse.json({ guide });
  } catch (error) {
    console.error("Mago Traductor error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo generar la guía.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
