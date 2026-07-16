import {
  deleteGeoLocation,
  getGeoLocationById,
  updateGeoLocation,
} from "@/lib/geo/service";
import { updateGeoLocationSchema } from "@/lib/geo/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const location = await getGeoLocationById(id);
    if (!location) {
      return NextResponse.json(
        { error: "Ubicación no encontrada." },
        { status: 404 },
      );
    }
    return NextResponse.json({ location });
  } catch (error) {
    console.error("Geo location GET error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la ubicación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateGeoLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }

    const location = await updateGeoLocation(id, parsed.data);
    return NextResponse.json({ location });
  } catch (error) {
    console.error("Geo location PATCH error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la ubicación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    await deleteGeoLocation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Geo location DELETE error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar la ubicación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
