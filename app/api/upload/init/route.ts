import { getFileExtension, isAllowedAudioFile } from "@/lib/audio-validation";
import { writeMeta } from "@/lib/audio-upload/staging";
import { resolveContextSealFromRequest } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { prisma } from "@/lib/prisma";
import { getUploadPublicUrl } from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function readOptionalField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const formData = await request.formData();
    const filename = readOptionalField(formData, "filename");
    const mimeType = readOptionalField(formData, "mimeType") ?? "";
    const totalChunksRaw = readOptionalField(formData, "totalChunks");
    const ambientContext =
      readOptionalField(formData, "ambientContext") ?? "caminata";

    if (!filename) {
      return NextResponse.json(
        { error: "Falta filename." },
        { status: 400 },
      );
    }

    if (!isAllowedAudioFile(filename, mimeType)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usá .mp3, .m4a, .wav, .ogg o .webm." },
        { status: 400 },
      );
    }

    const totalChunks = Number(totalChunksRaw);
    if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 500) {
      return NextResponse.json(
        { error: "totalChunks inválido." },
        { status: 400 },
      );
    }

    const extension = getFileExtension(filename);
    const uploadId = randomUUID();
    const assetId = randomUUID();
    const storedFilename = `${assetId}${extension}`;

    const asset = await prisma.audioAsset.create({
      data: {
        id: assetId,
        filename,
        fileUrl: getUploadPublicUrl(storedFilename),
        originalCreatedAt: new Date(),
        status: "PENDING",
        pipelineStation: "QUEUED",
        pipelineError: null,
      },
    });

    await writeMeta({
      uploadId,
      assetId: asset.id,
      filename,
      extension,
      totalChunks,
      ambientContext,
      received: [],
    });

    const contextSeal = resolveContextSealFromRequest(request);
    void registerBabelRecord({
      kind: "audio",
      physicalRef: asset.id,
      contentPreview: filename,
      occurredAt: asset.originalCreatedAt,
      contextSeal,
      channel: "audio",
      metadata: {
        filename,
        storedFilename,
        uploadId,
        ambientContext,
        chunked: true,
      },
    }).catch((error) => {
      console.error("Babel audio record error:", error);
    });

    return NextResponse.json(
      {
        uploadId,
        assetId: asset.id,
        jobId: asset.id,
        totalChunks,
        status: "QUEUED",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload init error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar la subida." },
      { status: 500 },
    );
  }
}
