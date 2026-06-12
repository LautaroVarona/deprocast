import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await prisma.audioAsset.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        fileUrl: true,
        durationMs: true,
        originalCreatedAt: true,
        status: true,
        partialText: true,
        createdAt: true,
        updatedAt: true,
        transcript: { select: { id: true, rawText: true } },
      },
    });

    const mapped = assets.map((asset) => ({
      ...asset,
      transcript: asset.transcript
        ? {
            id: asset.transcript.id,
            preview: asset.transcript.rawText.slice(0, 180).trim() +
              (asset.transcript.rawText.length > 180 ? "…" : ""),
          }
        : null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Assets list error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los audios." },
      { status: 500 },
    );
  }
}
