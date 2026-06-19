import {
  buildCalibrationQueue,
  normalizeQueueConfig,
} from "@/lib/vibe-calibrator/build-queue";
import type { CalibratorCardSource } from "@/lib/vibe-calibrator/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseSources(value: string | null): CalibratorCardSource[] {
  if (!value?.trim()) return ["validated"];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(
      (item): item is CalibratorCardSource =>
        item === "validated" || item === "generated",
    );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const config = normalizeQueueConfig({
      sources: parseSources(searchParams.get("sources")),
      campoSlug: searchParams.get("campoSlug") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 20),
    });

    const cards = await buildCalibrationQueue(config);

    return NextResponse.json({
      config,
      total: cards.length,
      cards,
    });
  } catch (error) {
    console.error("Vibe calibrator queue error:", error);
    return NextResponse.json(
      { error: "No se pudo generar la cola de calibración." },
      { status: 500 },
    );
  }
}
