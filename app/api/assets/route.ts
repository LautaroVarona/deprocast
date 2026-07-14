import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { resolveUniverseAudioAssetIds } from "@/lib/babel/universe-refs";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const assetSelect = {
  id: true,
  filename: true,
  fileUrl: true,
  durationMs: true,
  originalCreatedAt: true,
  status: true,
  partialText: true,
  createdAt: true,
  updatedAt: true,
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
      return NextResponse.json([]);
    }

    const assets = await prisma.audioAsset.findMany({
      where:
        audioFilter && shouldFilterByUniverse(universeSlug)
          ? { id: { in: [...audioFilter] } }
          : undefined,
      orderBy: { createdAt: "desc" },
      select: assetSelect,
    });

    const mapped = assets.map((asset) => ({
      ...asset,
      transcript: asset.transcript
        ? {
            id: asset.transcript.id,
            preview:
              asset.transcript.rawText.slice(0, 180).trim() +
              (asset.transcript.rawText.length > 180 ? "…" : ""),
            validated: asset.transcript._count.parentChunks > 0,
          }
        : null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Assets list error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los audios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
