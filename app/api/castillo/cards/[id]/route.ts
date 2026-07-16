import { updateCastleCard, removeCastleCard } from "@/lib/castillo/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const layoutSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  layout: layoutSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  emitClassificationEvent: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const card = await updateCastleCard(id, body);
    return NextResponse.json(card);
  } catch (error) {
    console.error("Castillo card patch error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la tarjeta.";
    const status = message.includes("no encontrada") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    await removeCastleCard(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Castillo card delete error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo quitar la tarjeta del canvas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
