import {
  getCalibrationSnapshot,
  updateProjectLudusStatus,
} from "@/lib/ludus/service";
import type { LudusProjectStatus } from "@/lib/ludus/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const snapshot = await getCalibrationSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Ludus calibration GET error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la calibración del reino.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      projectId?: string;
      status?: LudusProjectStatus;
    };

    if (!body.projectId || !body.status) {
      return NextResponse.json(
        { error: "projectId y status son obligatorios." },
        { status: 400 },
      );
    }

    const validStatuses: LudusProjectStatus[] = ["active", "paused", "inventory"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    await updateProjectLudusStatus(body.projectId, body.status);
    const snapshot = await getCalibrationSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Ludus calibration PATCH error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el proyecto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
