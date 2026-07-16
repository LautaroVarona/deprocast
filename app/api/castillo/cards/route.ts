import { CASTLE_SOURCE_TYPES } from "@/lib/castillo/types";
import { placeCatalogItem } from "@/lib/castillo/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  gridId: z.string().uuid(),
  sourceType: z.enum(CASTLE_SOURCE_TYPES),
  sourceId: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = bodySchema.parse(await request.json());
    const card = await placeCatalogItem(body);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Castillo card create error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo colocar la tarjeta en el canvas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
