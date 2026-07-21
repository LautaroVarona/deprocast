import { patchBlockExecution } from "@/lib/calendario/coagulate";
import { patchBlockExecutionSchema } from "@/lib/calendario/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchBlockExecutionSchema.parse(body);
    const event = await patchBlockExecution(id, parsed.executionStatus);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Calendario block PATCH error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el bloque.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
