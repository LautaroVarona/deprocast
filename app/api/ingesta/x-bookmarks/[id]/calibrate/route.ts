import { isValidCalibrationWeight } from "@/lib/ingesta/x-bookmarks/types";
import { calibrateXBookmark } from "@/lib/ingesta/x-bookmarks/store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
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

    if (body.weight === undefined || !isValidCalibrationWeight(body.weight)) {
      return NextResponse.json(
        { error: "El puntaje debe ser un entero entre 1 y 12." },
        { status: 400 },
      );
    }

    const bookmark = await calibrateXBookmark(id, body.weight);
    return NextResponse.json({ bookmark });
  } catch (error) {
    console.error("Calibrate x-bookmark error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo calibrar el marcador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
