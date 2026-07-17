import { updateMagoColeccionItem } from "@/lib/mago/store";
import type { MagoRefKind } from "@/lib/mago/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; index: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id, index: indexRaw } = await context.params;
    const index = Number(indexRaw);
    if (!Number.isInteger(index)) {
      return NextResponse.json(
        { error: "Índice inválido." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      titulo?: string;
      contenido?: string;
      refKind?: MagoRefKind;
      refId?: string | null;
      metadata?: Record<string, unknown>;
    };

    const coleccion = await updateMagoColeccionItem(id, index, body);
    return NextResponse.json({ coleccion });
  } catch (error) {
    console.error("Mago item patch error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el ítem.";
    const status = message.includes("no encontrada")
      ? 404
      : message.includes("Índice")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
