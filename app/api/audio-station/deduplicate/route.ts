import {
  mapAssetsToSummaries,
  scanForDuplicates,
} from "@/lib/audio-station";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();

    const assets = await prisma.audioAsset.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        fileUrl: true,
        durationMs: true,
        originalCreatedAt: true,
        status: true,
        createdAt: true,
        transcript: { select: { id: true, rawText: true } },
      },
    });

    const scan = scanForDuplicates(assets);

    return NextResponse.json({
      assets: mapAssetsToSummaries(assets),
      scan,
    });
  } catch (error) {
    console.error("Audio station scan error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo escanear duplicados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
