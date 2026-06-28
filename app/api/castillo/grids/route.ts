import { createGrid } from "@/lib/castillo/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1, "El nombre del grid es obligatorio."),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = bodySchema.parse(await request.json());
    const grid = await createGrid(body.name);
    return NextResponse.json(grid, { status: 201 });
  } catch (error) {
    console.error("Castillo grid create error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el grid.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
