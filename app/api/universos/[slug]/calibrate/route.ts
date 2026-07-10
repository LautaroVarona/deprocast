import {
  MAX_TRENCHES_WEIGHT,
  MIN_TRENCHES_WEIGHT,
} from "@/lib/babel/constants";
import { calibrateUniverse, getUniverseBySlug } from "@/lib/babel/universe-store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { slug } = await context.params;
    const existing = await getUniverseBySlug(slug);
    if (!existing) {
      return NextResponse.json({ error: "Universo no encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as { trenchesWeight?: number };
    const weight = body.trenchesWeight;

    if (
      typeof weight !== "number" ||
      !Number.isInteger(weight) ||
      weight < MIN_TRENCHES_WEIGHT ||
      weight > MAX_TRENCHES_WEIGHT
    ) {
      return NextResponse.json(
        { error: `Peso de trinchera inválido (${MIN_TRENCHES_WEIGHT}–${MAX_TRENCHES_WEIGHT}).` },
        { status: 400 },
      );
    }

    const universo = await calibrateUniverse(slug, weight);
    return NextResponse.json({ universo });
  } catch (error) {
    console.error("Universos calibrate error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo calibrar el universo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
