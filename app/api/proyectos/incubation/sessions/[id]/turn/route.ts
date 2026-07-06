import { runIncubationTurn } from "@/lib/projects/incubation/engine";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = (await request.json()) as { message?: string };
    const message = String(body.message ?? "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío." },
        { status: 400 },
      );
    }

    const result = await runIncubationTurn(id, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Incubation turn error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo procesar el turno.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
