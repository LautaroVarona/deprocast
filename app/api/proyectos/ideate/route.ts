import { buildIdeateResponse } from "@/lib/projects/ideate/extract";
import { ideateRequestSchema } from "@/lib/projects/ideate/schema";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Destilación HITL: estructura el brain dump vía LLM.
 * No persiste Atanor ni KG (invariante 2707 — coagulación solo en Coagular).
 */
export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const parsed = ideateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload de ideate inválido.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await buildIdeateResponse(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Ideate project error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo destilar el proyecto en el Atanor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
