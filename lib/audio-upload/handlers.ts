import "server-only";

import { getFileExtension, isAllowedAudioFile } from "@/lib/audio-validation";
import { UPLOAD_CHUNK_BYTES } from "@/lib/audio-upload/constants";
import {
  assembleChunks,
  cleanupStaging,
  readMeta,
  writeChunk,
  writeFinalAudio,
  writeMeta,
} from "@/lib/audio-upload/staging";
import { resolveContextSealFromRequest } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { processingQueue } from "@/lib/processing-queue";
import { prisma } from "@/lib/prisma";
import {
  getUploadDir,
  getUploadPublicUrl,
  isVercelRuntime,
} from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

function readOptionalField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export async function handleAudioUploadInit(
  request: NextRequest,
): Promise<NextResponse> {
  await ensureRuntimeReady();

  const formData = await request.formData();
  const filename = readOptionalField(formData, "filename");
  const mimeType = readOptionalField(formData, "mimeType") ?? "";
  const totalChunksRaw = readOptionalField(formData, "totalChunks");
  const ambientContext =
    readOptionalField(formData, "ambientContext") ?? "caminata";
  const lastModifiedRaw = readOptionalField(formData, "lastModified");

  if (!filename) {
    return NextResponse.json({ error: "Falta filename." }, { status: 400 });
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

  const lastModifiedMs = Number(lastModifiedRaw);
  const originalCreatedAt =
    Number.isFinite(lastModifiedMs) && lastModifiedMs > 0
      ? new Date(lastModifiedMs)
      : new Date();

  const asset = await prisma.audioAsset.create({
    data: {
      id: assetId,
      filename,
      fileUrl: getUploadPublicUrl(storedFilename),
      originalCreatedAt,
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
      lastModifiedMs: Number.isFinite(lastModifiedMs) ? lastModifiedMs : null,
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
}

export async function handleAudioUploadChunk(
  request: NextRequest,
): Promise<NextResponse> {
  await ensureRuntimeReady();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > UPLOAD_CHUNK_BYTES + 512 * 1024) {
    return NextResponse.json(
      { error: "Chunk demasiado grande.", code: 413 },
      { status: 413 },
    );
  }

  const formData = await request.formData();
  const uploadId = readOptionalField(formData, "uploadId");
  const indexRaw = readOptionalField(formData, "index");
  const totalRaw = readOptionalField(formData, "total");
  const chunk = formData.get("chunk");

  if (!uploadId) {
    return NextResponse.json({ error: "Falta uploadId." }, { status: 400 });
  }

  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "index inválido." }, { status: 400 });
  }

  const meta = await readMeta(uploadId);
  if (!meta) {
    return NextResponse.json(
      { error: "Upload no inicializado." },
      { status: 404 },
    );
  }

  if (Number.isInteger(total) && total !== meta.totalChunks) {
    return NextResponse.json(
      { error: "total no coincide con init." },
      { status: 400 },
    );
  }

  if (index >= meta.totalChunks) {
    return NextResponse.json(
      { error: "index fuera de rango." },
      { status: 400 },
    );
  }

  if (!(chunk instanceof Blob)) {
    return NextResponse.json({ error: "Falta chunk." }, { status: 400 });
  }

  const buffer = Buffer.from(await chunk.arrayBuffer());
  if (buffer.byteLength > UPLOAD_CHUNK_BYTES + 64 * 1024) {
    return NextResponse.json(
      { error: "Chunk demasiado grande.", code: 413 },
      { status: 413 },
    );
  }

  await writeChunk(uploadId, index, buffer);

  if (!meta.received.includes(index)) {
    meta.received.push(index);
    meta.received.sort((a, b) => a - b);
    await writeMeta(meta);
  }

  return NextResponse.json({
    uploadId,
    assetId: meta.assetId,
    index,
    received: meta.received.length,
    totalChunks: meta.totalChunks,
  });
}

export async function handleAudioUploadComplete(
  request: NextRequest,
): Promise<NextResponse> {
  await ensureRuntimeReady();

  const formData = await request.formData();
  const uploadId = readOptionalField(formData, "uploadId");

  if (!uploadId) {
    return NextResponse.json({ error: "Falta uploadId." }, { status: 400 });
  }

  const meta = await readMeta(uploadId);
  if (!meta) {
    return NextResponse.json(
      { error: "Upload no inicializado." },
      { status: 404 },
    );
  }

  if (meta.received.length !== meta.totalChunks) {
    return NextResponse.json(
      {
        error: "Faltan chunks.",
        received: meta.received.length,
        totalChunks: meta.totalChunks,
      },
      { status: 400 },
    );
  }

  const buffer = await assembleChunks(uploadId, meta.totalChunks);
  const storedFilename = `${meta.assetId}${meta.extension}`;
  await writeFinalAudio(storedFilename, buffer);

  await prisma.audioAsset.update({
    where: { id: meta.assetId },
    data: {
      pipelineStation: "STT",
      pipelineError: null,
      status: "PENDING",
    },
  });

  const ambientContext = meta.ambientContext;
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  await writeFile(
    path.join(uploadDir, `${meta.assetId}.meta.json`),
    JSON.stringify({ ambientContext, uploadId }),
    "utf8",
  );

  await cleanupStaging(uploadId);

  const queued = processingQueue.enqueue(meta.assetId);
  if (isVercelRuntime()) {
    void processingQueue.reclaimAndDrain().catch(() => undefined);
  }

  return NextResponse.json(
    {
      id: meta.assetId,
      jobId: meta.assetId,
      uploadId,
      filename: meta.filename,
      status: queued ? "QUEUED" : "PENDING",
      pipelineStation: "STT",
      metabolismStarted: queued,
      ambientContext,
    },
    { status: 201 },
  );
}
