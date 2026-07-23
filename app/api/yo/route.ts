import { ensureYoShell } from "@/lib/yo/store";
import { patchYoSchema } from "@/lib/yo/types";
import { patchYo } from "@/lib/yo/store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const yo = await ensureYoShell();
    return NextResponse.json({
      yo,
      genesisComplete: yo.genesisCompleted,
      profile: {
        // compat temporal para clientes legacy
        id: yo.id,
        displayName: yo.operatorName ?? "",
        operationalStatus: yo.operationalStatus,
        energyLevel: yo.energyLevel,
        calibration: yo.calibration,
        updatedAt: yo.updatedAt,
      },
    });
  } catch (error) {
    console.error("Yo GET error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el nodo Yo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const parsed = patchYoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const yo = await patchYo(parsed.data);
    return NextResponse.json({ yo, genesisComplete: yo.genesisCompleted });
  } catch (error) {
    console.error("Yo PATCH error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el nodo Yo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
