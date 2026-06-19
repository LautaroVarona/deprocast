import { type IngestaChannel } from "@/lib/purifier/constants";
import {
  captureAndPurify,
  type CaptureGravity,
} from "@/lib/purifier/capture";
import { isSourceType } from "@/lib/document-constants";
import { isCampoSlug } from "@/lib/projects/campos";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const CHANNELS: IngestaChannel[] = ["texto", "audio", "tablas", "vision"];

function parseGravity(body: Record<string, unknown>): CaptureGravity | undefined {
  const raw = body.gravity;
  if (!raw || typeof raw !== "object") return undefined;

  const gravity = raw as Record<string, unknown>;
  const parsed: CaptureGravity = {};

  if (typeof gravity.title === "string") {
    parsed.title = gravity.title;
  }
  if (typeof gravity.campoSlug === "string" && isCampoSlug(gravity.campoSlug)) {
    parsed.campoSlug = gravity.campoSlug;
  }
  if (typeof gravity.onda === "string") {
    parsed.onda = gravity.onda;
  }
  if (isSourceType(gravity.sourceType)) {
    parsed.sourceType = gravity.sourceType;
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { error: "Cuerpo de la petición inválido." },
        { status: 400 },
      );
    }

    const channel = body.channel;
    if (
      typeof channel !== "string" ||
      !CHANNELS.includes(channel as IngestaChannel)
    ) {
      return NextResponse.json(
        { error: "channel inválido." },
        { status: 400 },
      );
    }

    let rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
    let filename =
      typeof body.filename === "string" ? body.filename : undefined;
    const assetId = typeof body.assetId === "string" ? body.assetId : undefined;
    const metadata: Record<string, string | null> = {};

    if (assetId) {
      const asset = await prisma.audioAsset.findUnique({
        where: { id: assetId },
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

    const result = await captureAndPurify({
      channel: channel as IngestaChannel,
      rawText,
      filename,
      assetId,
      metadata,
      gravity: parseGravity(body),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Ingesta capture error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo capturar la prima materia.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
