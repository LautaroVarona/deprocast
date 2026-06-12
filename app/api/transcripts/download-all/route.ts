import { buildCombinedTranscriptMarkdown } from "@/lib/transcript-markdown";
import { prisma } from "@/lib/prisma";
import { toContentDispositionFilename } from "@/lib/safe-filename";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await prisma.audioAsset.findMany({
      where: {
        transcript: { isNot: null },
      },
      orderBy: { originalCreatedAt: "asc" },
      include: { transcript: true },
    });

    if (assets.length === 0) {
      return NextResponse.json(
        { error: "No hay transcripciones completadas para descargar." },
        { status: 404 },
      );
    }

    const markdown = buildCombinedTranscriptMarkdown(
      assets
        .filter((asset) => asset.transcript)
        .map((asset) => ({
          filename: asset.filename,
          originalCreatedAt: asset.originalCreatedAt,
          status: asset.status,
          rawText: asset.transcript!.rawText,
          confidence: asset.transcript!.confidence,
          transcriptCreatedAt: asset.transcript!.createdAt,
        })),
    );

    const filename = "transcripciones.md";

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; ${toContentDispositionFilename(filename)}`,
      },
    });
  } catch (error) {
    console.error("Transcripts bulk download error:", error);
    return NextResponse.json(
      { error: "No se pudieron descargar las transcripciones." },
      { status: 500 },
    );
  }
}
