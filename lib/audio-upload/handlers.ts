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
  type ChunkUploadMeta,
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

function readChunkIndex(formData: FormData): number | null {
  const raw =
    readOptionalField(formData, "chunkIndex") ??
    readOptionalField(formData, "index");
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

async function ensureAssetAndMeta(input: {
  uploadId: string;
  filename: string;
  mimeType: string;
  totalChunks: number;
  ambientContext: string;
  lastModifiedMs?: number;
  request: NextRequest;
}): Promise<ChunkUploadMeta> {
  const existing = await readMeta(input.uploadId);
  if (existing) return existing;

  if (!isAllowedAudioFile(input.filename, input.mimeType)) {
    throw new Error("Formato no permitido. Usá .mp3, .m4a, .wav, .ogg o .webm.");
  }

  const extension = getFileExtension(input.filename);
  const assetId = randomUUID();
  const storedFilename = `${assetId}${extension}`;
  const originalCreatedAt =
    input.lastModifiedMs && input.lastModifiedMs > 0
      ? new Date(input.lastModifiedMs)
      : new Date();

  await prisma.audioAsset.create({
    data: {
      id: assetId,
      filename: input.filename,
      fileUrl: getUploadPublicUrl(storedFilename),
      originalCreatedAt,
      status: "PENDING",
      pipelineStation: "QUEUED",
      pipelineError: null,
    },
  });

  const meta: ChunkUploadMeta = {
    uploadId: input.uploadId,
    assetId,
    filename: input.filename,
    extension,
    totalChunks: input.totalChunks,
    ambientContext: input.ambientContext,
    received: [],
  };
  await writeMeta(meta);

  const contextSeal = resolveContextSealFromRequest(input.request);
  void registerBabelRecord({
    kind: "audio",
    physicalRef: assetId,
    contentPreview: input.filename,
    occurredAt: originalCreatedAt,
    contextSeal,
    channel: "audio",
    metadata: {
      filename: input.filename,
      storedFilename,
      uploadId: input.uploadId,
      ambientContext: input.ambientContext,
      chunked: true,
    },
  }).catch((error) => {
    console.error("Babel audio record error:", error);
  });

  return meta;
}

/** Init explícito (opcional): el chunk también auto-inicializa. */
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
  const clientUploadId = readOptionalField(formData, "uploadId");

  if (!filename) {
    return NextResponse.json({ error: "Falta filename." }, { status: 400 });
  }

  const totalChunks = Number(totalChunksRaw);
  if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 500) {
    return NextResponse.json(
      { error: "totalChunks inválido." },
      { status: 400 },
    );
  }

  const uploadId = clientUploadId || randomUUID();
  const lastModifiedMs = Number(lastModifiedRaw);

  try {
    const meta = await ensureAssetAndMeta({
      uploadId,
      filename,
      mimeType,
      totalChunks,
      ambientContext,
      lastModifiedMs: Number.isFinite(lastModifiedMs) ? lastModifiedMs : undefined,
      request,
    });

    return NextResponse.json(
      {
        uploadId: meta.uploadId,
        assetId: meta.assetId,
        jobId: meta.assetId,
        totalChunks: meta.totalChunks,
        status: "QUEUED",
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar la subida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Recibe un chunk de audio.
 * Auto-crea sesión en data/uploads/tmp/{uploadId}/ si aún no existe
 * (evita "Upload no inicializado" por carrera o init fallido).
 */
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
  const uploadId =
    readOptionalField(formData, "uploadId") || randomUUID();
  const filename = readOptionalField(formData, "filename") ?? "audio.bin";
  const mimeType = readOptionalField(formData, "mimeType") ?? "";
  const totalRaw =
    readOptionalField(formData, "totalChunks") ??
    readOptionalField(formData, "total");
  const ambientContext =
    readOptionalField(formData, "ambientContext") ?? "caminata";
  const lastModifiedRaw = readOptionalField(formData, "lastModified");
  const index = readChunkIndex(formData);
  const chunk = formData.get("chunk");

  if (index === null) {
    return NextResponse.json(
      { error: "chunkIndex inválido." },
      { status: 400 },
    );
  }

  const totalChunks = Number(totalRaw);
  if (!Number.isInteger(totalChunks) || totalChunks < 1) {
    return NextResponse.json(
      { error: "totalChunks inválido." },
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

  if (index >= totalChunks) {
    return NextResponse.json(
      { error: "chunkIndex fuera de rango." },
      { status: 400 },
    );
  }

  let meta: ChunkUploadMeta;
  try {
    meta = await ensureAssetAndMeta({
      uploadId,
      filename,
      mimeType,
      totalChunks,
      ambientContext,
      lastModifiedMs: Number(lastModifiedRaw) || undefined,
      request,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo inicializar upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (totalChunks !== meta.totalChunks) {
    // Cliente reintentó con distinto total: actualizar
    meta.totalChunks = totalChunks;
  }

  await writeChunk(uploadId, index, buffer);

  if (!meta.received.includes(index)) {
    meta.received.push(index);
    meta.received.sort((a, b) => a - b);
    await writeMeta(meta);
  }

  return NextResponse.json({
    uploadId: meta.uploadId,
    assetId: meta.assetId,
    chunkIndex: index,
    index,
    received: meta.received.length,
    totalChunks: meta.totalChunks,
    tmpDir: `data/uploads/tmp/${meta.uploadId}`,
  });
}

export async function handleAudioUploadComplete(
  request: NextRequest,
): Promise<NextResponse> {
  await ensureRuntimeReady();

  const formData = await request.formData();
  const uploadId = readOptionalField(formData, "uploadId");
  const filenameHint = readOptionalField(formData, "filename");

  if (!uploadId) {
    return NextResponse.json({ error: "Falta uploadId." }, { status: 400 });
  }

  let meta = await readMeta(uploadId);
  if (!meta && filenameHint) {
    // Último recurso: sesión nunca persistió meta
    return NextResponse.json(
      {
        error:
          "Upload no encontrado en tmp/. Reintentá desde el primer chunk.",
      },
      { status: 404 },
    );
  }

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
        missing: Array.from({ length: meta.totalChunks }, (_, i) => i).filter(
          (i) => !meta!.received.includes(i),
        ),
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

  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  await writeFile(
    path.join(uploadDir, `${meta.assetId}.meta.json`),
    JSON.stringify({
      ambientContext: meta.ambientContext,
      uploadId,
      filename: meta.filename,
    }),
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
      ambientContext: meta.ambientContext,
    },
    { status: 201 },
  );
}
