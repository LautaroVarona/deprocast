import { calibratePendingTask } from "@/lib/pendientes/store";
import { calibratePendingTaskSchema } from "@/lib/pendientes/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = calibratePendingTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Peso inválido." },
        { status: 400 },
      );
    }

    const task = await calibratePendingTask(id, parsed.data.weight);
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Pendiente calibrate error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo calibrar la tarea.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
