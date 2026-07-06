import {
  forgeMicrotask,
  getCampamentoSnapshot,
} from "@/lib/ludus/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const snapshot = await getCampamentoSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Ludus campamento GET error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el Campamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      projectId?: string;
      title?: string;
      estimatedMin?: number;
      baseWeight?: number;
      isGolden?: boolean;
    };

    if (!body.projectId || !body.title?.trim()) {
      return NextResponse.json(
        { error: "projectId y title son obligatorios." },
        { status: 400 },
      );
    }

    const result = await forgeMicrotask({
      projectId: body.projectId,
      title: body.title,
      estimatedMin: body.estimatedMin,
      baseWeight: body.baseWeight,
      isGolden: body.isGolden,
    });

    const snapshot = await getCampamentoSnapshot();
    return NextResponse.json({ ...result, snapshot }, { status: 201 });
  } catch (error) {
    console.error("Ludus campamento POST error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo forjar la tarea.";
    const status = message.includes("Telemetría") || message.includes("límite") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
