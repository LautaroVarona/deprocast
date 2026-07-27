import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { ensureYoShell, setOperationalClock } from "@/lib/yo/store";
import { operationalClockSchema } from "@/lib/yo/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const yo = await ensureYoShell();
    return NextResponse.json({
      mago12: yo.mago12,
      mago3: yo.mago3,
      labels: {
        mago3: yo.mago3,
      },
    });
  } catch (error) {
    console.error("Yo clock GET error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el reloj Magos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = await request.json();
    const parsed = operationalClockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const yo = await setOperationalClock(parsed.data);
    return NextResponse.json({
      mago12: yo.mago12,
      mago3: yo.mago3,
      yo,
    });
  } catch (error) {
    console.error("Yo clock PATCH error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el reloj Magos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
