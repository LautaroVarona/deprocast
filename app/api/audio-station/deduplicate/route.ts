import {
  mapAssetsToSummaries,
  scanForDuplicates,
} from "@/lib/audio-station";
import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { resolveUniverseAudioAssetIds } from "@/lib/babel/universe-refs";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const audioAssetSelect = {
  id: true,
  filename: true,
  fileUrl: true,
  durationMs: true,
  originalCreatedAt: true,
  status: true,
  createdAt: true,
  transcript: {
    select: {
      id: true,
      rawText: true,
      _count: { select: { parentChunks: true } },
    },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const universeSlug = resolveContextSealFromRequest(request);
    const audioFilter = await resolveUniverseAudioAssetIds(universeSlug);

    if (audioFilter && audioFilter.size === 0) {
      return NextResponse.json({
        assets: [],
        scan: { groups: [], totalDuplicates: 0 },
        universe: universeSlug,
      });
    }

    const assets = await prisma.audioAsset.findMany({
      where:
        audioFilter && shouldFilterByUniverse(universeSlug)
          ? { id: { in: [...audioFilter] } }
          : undefined,
      orderBy: { createdAt: "desc" },
      select: audioAssetSelect,
    });

    const scan = scanForDuplicates(assets);

    return NextResponse.json({
      assets: mapAssetsToSummaries(assets),
      scan,
      universe: universeSlug,
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
