import { isAllowedAudioFile } from "@/lib/audio-validation";
import { resolveContextSealFromRequest } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { isSourceType } from "@/lib/document-constants";
import { processingQueue } from "@/lib/processing-queue";
import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import { prisma } from "@/lib/prisma";
import {
  getUploadDir,
  getUploadPublicUrl,
} from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { randomUUID } from "crypto";
import { mkdir, stat, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";

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

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const extension = path.extname(file.name).toLowerCase();
    const storedFilename = `${randomUUID()}${extension}`;
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

    const asset = await prisma.audioAsset.create({
      data: {
        filename: file.name,
        fileUrl: getUploadPublicUrl(storedFilename),
        originalCreatedAt: fileStats.birthtime,
        status: "PENDING",
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
