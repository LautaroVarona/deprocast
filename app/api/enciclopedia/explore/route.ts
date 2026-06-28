import { getOrExploreConcept } from "@/lib/enciclopedia/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  concept: z.string().min(1, "El concepto no puede estar vacío."),
  parentEntryId: z.string().uuid().optional(),
  triggerTerm: z.string().optional(),
  forceRegenerate: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = bodySchema.parse(await request.json());
    const result = await getOrExploreConcept(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Enciclopedia explore error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "No se pudo explorar el concepto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
