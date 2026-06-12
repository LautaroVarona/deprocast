import { runPurificationPipeline } from "@/lib/purifier/engine";
import type { GravityInput } from "@/lib/purifier/types";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rawText?: string;
      assetId?: string;
      filename?: string;
      gravity?: GravityInput;
    };

    let rawText = body.rawText?.trim() ?? "";
    let filename = body.filename ?? "transcripcion";
    const metadata: Record<string, string | null> = {};

    if (body.assetId) {
      const asset = await prisma.audioAsset.findUnique({
        where: { id: body.assetId },
        include: { transcript: true },
      });

      if (!asset) {
        return NextResponse.json(
          { error: "Audio no encontrado." },
          { status: 404 },
        );
      }

      if (!asset.transcript?.rawText?.trim()) {
        return NextResponse.json(
          { error: "El audio aún no tiene transcripción disponible." },
          { status: 422 },
        );
      }

      rawText = asset.transcript.rawText;
      filename = asset.filename;
      metadata.estado = asset.status;
      metadata.transcritoEl = asset.transcript.createdAt.toISOString();
    }

    if (!rawText) {
      return NextResponse.json(
        { error: "Se requiere rawText o assetId con transcripción." },
        { status: 400 },
      );
    }

    const record = await runPurificationPipeline({
      rawText,
      assetId: body.assetId,
      filename,
      metadata,
      gravity: body.gravity,
    });

    return NextResponse.json(
      {
        reviewId: record.reviewId,
        particula: record.particula,
        doubts: record.doubts,
        metaTagsSecundarios: record.metaTagsSecundarios,
        suggestedDimensions: record.suggestedDimensions,
        processedAt: record.processedAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Purifier error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar el pipeline de purificación.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
