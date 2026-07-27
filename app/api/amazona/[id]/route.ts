import {
  deleteAmazonAResource,
  getAmazonAResource,
  updateAmazonAResource,
} from "@/lib/amazona/store";
import { updateAmazonAResourceSchema } from "@/lib/amazona/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const resource = await getAmazonAResource(id);
    if (!resource) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }
    return NextResponse.json({ resource });
  } catch (error) {
    console.error("AmazonA GET [id] error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el recurso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateAmazonAResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const resource = await updateAmazonAResource(id, parsed.data);
    return NextResponse.json({ resource });
  } catch (error) {
    console.error("AmazonA PATCH error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el recurso.";
    const status = message.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    await deleteAmazonAResource(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("AmazonA DELETE error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo borrar el recurso.";
    const status = message.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
