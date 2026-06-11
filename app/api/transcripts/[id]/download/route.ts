import { buildTranscriptMarkdown } from "@/lib/transcript-markdown";
import { prisma } from "@/lib/prisma";
import { toContentDispositionFilename, toMarkdownFilename } from "@/lib/safe-filename";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const asset = await prisma.audioAsset.findUnique({
      where: { id },
      include: { transcript: true },
    });

    if (!asset?.transcript) {
      return NextResponse.json(
        { error: "Este audio no tiene transcripción disponible." },
        { status: 404 },
      );
    }

    const markdown = buildTranscriptMarkdown({
      filename: asset.filename,
      originalCreatedAt: asset.originalCreatedAt,
      status: asset.status,
      rawText: asset.transcript.rawText,
      confidence: asset.transcript.confidence,
      transcriptCreatedAt: asset.transcript.createdAt,
    });

    const downloadName = toMarkdownFilename(asset.filename);

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; ${toContentDispositionFilename(downloadName)}`,
      },
    });
  } catch (error) {
    console.error("Transcript download error:", error);
    return NextResponse.json(
      { error: "No se pudo descargar la transcripción." },
      { status: 500 },
    );
  }
}
