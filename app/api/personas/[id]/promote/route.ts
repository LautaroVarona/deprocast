import { promotePersona } from "@/lib/personas/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Id de persona inválido." },
        { status: 400 },
      );
    }

    const persona = await promotePersona(id.trim());
    return NextResponse.json({ persona });
  } catch (error) {
    console.error("Persona promote error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo sellar la persona.";
    const status = message.includes("no encontrada") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
