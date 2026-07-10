import {
  completeAssault,
  getTrincheraSnapshot,
  startAssault,
} from "@/lib/ludus/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const snapshot = await getTrincheraSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Ludus trinchera GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la Trinchera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      action?: string;
      title?: string;
      durationMin?: number;
      microtaskId?: string;
      pendingTaskId?: string;
      assaultId?: string;
      tabSurvived?: boolean;
      completed?: boolean;
    };

    if (body.action === "complete") {
      if (!body.assaultId) {
        return NextResponse.json({ error: "assaultId requerido." }, { status: 400 });
      }

      const result = await completeAssault({
        assaultId: body.assaultId,
        tabSurvived: body.tabSurvived ?? false,
        completed: body.completed ?? false,
      });

      return NextResponse.json(result);
    }

    const assault = await startAssault({
      title: body.title ?? "",
      durationMin: body.durationMin ?? 25,
      microtaskId: body.microtaskId,
      pendingTaskId: body.pendingTaskId,
    });

    return NextResponse.json({ assault }, { status: 201 });
  } catch (error) {
    console.error("Ludus trinchera POST error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar el asalto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
