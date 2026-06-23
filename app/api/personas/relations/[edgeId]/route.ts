import {
  deleteRelacionEntity,
  updateRelacionEntity,
} from "@/lib/personas/relations";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ edgeId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { edgeId } = await context.params;
    const body = (await request.json()) as {
      tipoRelacion?: string;
      rolPrincipal?: string;
      contexto?: string;
    };

    const relation = await updateRelacionEntity(edgeId, body);
    return NextResponse.json({ relation });
  } catch (error) {
    console.error("Persona relation update error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la relación.";
    const status = message.includes("no encontrada") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { edgeId } = await context.params;
    await deleteRelacionEntity(edgeId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Persona relation delete error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la relación.";
    const status = message.includes("no encontrada") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
