import { buildTranscriptMarkdown } from "@/lib/transcript-markdown";
import { prisma } from "@/lib/prisma";
import { toContentDispositionFilename, toMarkdownFilename } from "@/lib/safe-filename";
import JSZip from "jszip";
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

    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    for (const asset of assets) {
      if (!asset.transcript) {
        continue;
      }

      const baseName = toMarkdownFilename(asset.filename);
      const count = usedNames.get(baseName) ?? 0;
      usedNames.set(baseName, count + 1);

      const zipName =
        count === 0
          ? baseName
          : toMarkdownFilename(asset.filename, asset.id.slice(0, 8));

      const markdown = buildTranscriptMarkdown({
        filename: asset.filename,
        originalCreatedAt: asset.originalCreatedAt,
        status: asset.status,
        rawText: asset.transcript.rawText,
        confidence: asset.transcript.confidence,
        transcriptCreatedAt: asset.transcript.createdAt,
      });

      zip.file(zipName, markdown);
    }

    const archive = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const zipName = "transcripciones.zip";

    return new NextResponse(archive, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; ${toContentDispositionFilename(zipName)}`,
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
