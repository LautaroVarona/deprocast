import { calibrateXBookmark } from "@/lib/ingesta/x-bookmarks/store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { normalizeKgEdgeWeight } from "@/lib/validations/kg-schema";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { id } = await context.params;
    const body = (await request.json()) as { weight?: number };

    if (body.weight === undefined || typeof body.weight !== "number") {
      return NextResponse.json(
        { error: "Se requiere un weight numérico." },
        { status: 400 },
      );
    }

    const normalized = normalizeKgEdgeWeight(body.weight);
    const bookmark = await calibrateXBookmark(id, normalized.weight);
    return NextResponse.json({
      bookmark,
      weightFallback: normalized.fellBack,
      requestedWeight: body.weight,
    });
  } catch (error) {
    console.error("Calibrate x-bookmark error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo calibrar el marcador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
