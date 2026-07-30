import { isAllowedAudioFile } from "@/lib/audio-validation";
import { UPLOAD_SINGLE_SHOT_MAX_BYTES } from "@/lib/audio-upload/constants";
import { resolveContextSealFromRequest } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { isSourceType } from "@/lib/document-constants";
import { processingQueue } from "@/lib/processing-queue";
import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import { prisma } from "@/lib/prisma";
import {
  getUploadDir,
  getUploadPublicUrl,
  isVercelRuntime,
} from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { randomUUID } from "crypto";
import { mkdir, stat, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 },
      );
    }

    if (!isAllowedAudioFile(file.name, file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usá .mp3, .m4a, .wav, .ogg o .webm." },
        { status: 400 },
      );
    }

    // Fallback legacy: en Vercel el techo de body es ~4.5 MB — forzar chunking.
    if (isVercelRuntime() && file.size > UPLOAD_SINGLE_SHOT_MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            "Archivo demasiado grande para single-shot. Usá upload por chunks (/api/upload/init).",
          code: 413,
          maxBytes: UPLOAD_SINGLE_SHOT_MAX_BYTES,
        },
        { status: 413 },
      );
    }

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const extension = path.extname(file.name).toLowerCase();
    const assetId = randomUUID();
    const storedFilename = `${assetId}${extension}`;
    const filePath = path.join(uploadDir, storedFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileStats = await stat(filePath);

    const campoSlug = readOptionalField(formData, "campoSlug")
      ?? readOptionalField(formData, "field")
      ?? DEFAULT_CAMPO_SLUG;
    const onda = readOptionalField(formData, "onda") ?? "sin-clasificar";
    const rawSourceType = readOptionalField(formData, "sourceType");
    const sourceType = isSourceType(rawSourceType)
      ? rawSourceType
      : "personal_writing";
    const title =
      readOptionalField(formData, "title") ??
      file.name.replace(/\.[^.]+$/, "");

    const ambientContext =
      readOptionalField(formData, "ambientContext") ?? "caminata";

    await writeFile(
      path.join(uploadDir, `${assetId}.meta.json`),
      JSON.stringify({ ambientContext }),
      "utf8",
    );

    const asset = await prisma.audioAsset.create({
      data: {
        id: assetId,
        filename: file.name,
        fileUrl: getUploadPublicUrl(storedFilename),
        originalCreatedAt: fileStats.birthtime,
        status: "PENDING",
        pipelineStation: "STT",
        pipelineError: null,
      },
    });

    const contextSeal = resolveContextSealFromRequest(request);

    void registerBabelRecord({
      kind: "audio",
      physicalRef: asset.id,
      contentPreview: file.name,
      occurredAt: fileStats.birthtime,
      contextSeal,
      campoSlug,
      channel: "audio",
      metadata: {
        filename: file.name,
        storedFilename,
        title,
        onda,
        sourceType,
        campoSlug,
      },
    }).catch((error) => {
      console.error("Babel audio record error:", error);
    });

    const jobId = asset.id;
    const queued = processingQueue.enqueue(jobId);

    return NextResponse.json(
      {
        id: asset.id,
        jobId,
        filename: asset.filename,
        status: queued ? "QUEUED" : asset.status,
        metabolismStarted: queued,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "No se pudo subir el archivo." },
      { status: 500 },
    );
  }
}
