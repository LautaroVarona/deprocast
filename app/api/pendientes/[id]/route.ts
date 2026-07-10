import {
  completePendingTask,
  getPendingTaskById,
  recognizePendingTask,
  rejectPendingTask,
} from "@/lib/pendientes/store";
import { patchPendingTaskSchema } from "@/lib/pendientes/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const task = await getPendingTaskById(id);
    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Pendiente GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la tarea.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchPendingTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Acción inválida." },
        { status: 400 },
      );
    }

    let task;
    switch (parsed.data.action) {
      case "recognize":
        task = await recognizePendingTask(id);
        break;
      case "reject":
        task = await rejectPendingTask(id);
        break;
      case "complete":
        task = await completePendingTask(id);
        break;
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Pendiente PATCH error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la tarea.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
