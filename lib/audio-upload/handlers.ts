import "server-only";

import { getFileExtension, isAllowedAudioFile } from "@/lib/audio-validation";
import { assertBlobTokenConfigured } from "@/lib/audio-upload/blob-staging";
import { UPLOAD_CHUNK_BYTES } from "@/lib/audio-upload/constants";
import {
  assembleChunks,
  cleanupStaging,
  listReceivedChunks,
  readMeta,
  writeChunk,
  writeFinalAudio,
  writeMeta,
  type ChunkUploadMeta,
} from "@/lib/audio-upload/staging";
import { resolveContextSealFromRequest } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { extractLineageFromFilename } from "@/lib/ingesta/temporal-lineage";
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

  if (isVercelRuntime()) {
    assertBlobTokenConfigured();
  }

  const extension = getFileExtension(input.filename);
  const assetId = randomUUID();
  const storedFilename = `${assetId}${extension}`;
  const fromFilename = extractLineageFromFilename(input.filename);
  const originalCreatedAt =
    fromFilename?.timestampExacto ??
    (input.lastModifiedMs && input.lastModifiedMs > 0
      ? new Date(input.lastModifiedMs)
      : new Date());

  await prisma.audioAsset.upsert({
    where: { id: assetId },
    create: {
      id: assetId,
      filename: input.filename,
      fileUrl: getUploadPublicUrl(storedFilename),
      originalCreatedAt,
      status: "PENDING",
      pipelineStation: "QUEUED",
      pipelineError: null,
    },
    update: {
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
  try {
    await ensureRuntimeReady();

    const formData = await request.formData();
    const uploadId = readOptionalField(formData, "uploadId");
    const assetIdHint = readOptionalField(formData, "assetId");
    const filenameHint = readOptionalField(formData, "filename");
    const fileField = formData.get("file");

    if (!uploadId && !assetIdHint) {
      return NextResponse.json(
        { error: "Falta uploadId o assetId.", ok: false },
        { status: 400 },
      );
    }

    let meta = uploadId ? await readMeta(uploadId) : null;

    // Preferir buffer del cliente (disparo único ≤3.5MB).
    let buffer: Buffer | null = null;
    if (fileField instanceof Blob && fileField.size > 0) {
      buffer = Buffer.from(await fileField.arrayBuffer());
    }

    // Reconstruir meta mínima si hay assetId + file (single-shot) o hints.
    if (!meta && assetIdHint && (buffer || filenameHint)) {
      const name = filenameHint || "audio.bin";
      const extension = getFileExtension(name);
      meta = {
        uploadId: uploadId || assetIdHint,
        assetId: assetIdHint,
        filename: name,
        extension,
        totalChunks: 1,
        ambientContext: "caminata",
        received: [0],
      };
    }

    // En Vercel: si hay uploadId, listar chunks Blob aunque meta Prisma/local falte.
    if (!meta && uploadId && isVercelRuntime()) {
      const receivedLive = await listReceivedChunks(uploadId);
      if (receivedLive.length > 0 && filenameHint && assetIdHint) {
        meta = {
          uploadId,
          assetId: assetIdHint,
          filename: filenameHint,
          extension: getFileExtension(filenameHint),
          totalChunks: receivedLive.length,
          ambientContext: "caminata",
          received: receivedLive,
        };
      }
    }

    if (!meta) {
      return NextResponse.json(
        {
          error: isVercelRuntime()
            ? "Sesión de upload no encontrada en Blob. Verificá BLOB_READ_WRITE_TOKEN y reintentá init+chunks."
            : "Sesión de upload no encontrada.",
          ok: false,
          code: "UPLOAD_SESSION_MISSING",
        },
        { status: 404 },
      );
    }

    if (!buffer) {
      const receivedLive = await listReceivedChunks(meta.uploadId);
      const effectiveReceived =
        receivedLive.length >= meta.received.length
          ? receivedLive
          : meta.received;

      const total =
        meta.totalChunks > 0
          ? meta.totalChunks
          : Math.max(effectiveReceived.length, 1);

      if (effectiveReceived.length < total) {
        return NextResponse.json(
          {
            error: "Faltan chunks.",
            ok: false,
            received: effectiveReceived.length,
            totalChunks: total,
            missing: Array.from({ length: total }, (_, i) => i).filter(
              (i) => !effectiveReceived.includes(i),
            ),
          },
          { status: 400 },
        );
      }

      buffer = await assembleChunks(meta.uploadId, total);
      meta.totalChunks = total;
    }

    const storedFilename = `${meta.assetId}${meta.extension}`;
    const onVercel = isVercelRuntime();
    const fromFilename = extractLineageFromFilename(meta.filename);
    const originalCreatedAt = fromFilename?.timestampExacto ?? new Date();

    // En local: persistir archivo para la cola FFmpeg. En Vercel el buffer va a STT.
    if (!onVercel) {
      await writeFinalAudio(storedFilename, buffer);
    } else {
      try {
        await writeFinalAudio(storedFilename, buffer);
      } catch {
        /* ignore FS efímero */
      }
    }

    try {
      await prisma.audioAsset.upsert({
        where: { id: meta.assetId },
        create: {
          id: meta.assetId,
          filename: meta.filename,
          fileUrl: getUploadPublicUrl(storedFilename),
          originalCreatedAt,
          status: onVercel ? "PROCESSING" : "PENDING",
          pipelineStation: "STT",
          pipelineError: null,
        },
        update: {
          filename: meta.filename,
          fileUrl: getUploadPublicUrl(storedFilename),
          originalCreatedAt,
          pipelineStation: "STT",
          pipelineError: null,
          status: onVercel ? "PROCESSING" : "PENDING",
        },
      });
    } catch (error) {
      console.error("AudioAsset upsert failed:", error);
      return NextResponse.json(
        {
          error: "No se pudo persistir el asset en Prisma.",
          ok: false,
          pipelineStation: "ERROR",
        },
        { status: 200 },
      );
    }

    try {
      const uploadDir = getUploadDir();
      await mkdir(uploadDir, { recursive: true });
      await writeFile(
        path.join(uploadDir, `${meta.assetId}.meta.json`),
        JSON.stringify({
          ambientContext: meta.ambientContext,
          uploadId: meta.uploadId,
          filename: meta.filename,
        }),
        "utf8",
      );
    } catch (error) {
      console.warn("meta.json write failed (non-fatal):", error);
    }

    await cleanupStaging(meta.uploadId).catch(() => undefined);

    if (onVercel) {
      const {
        persistTranscriptFromBuffer,
        isPrismaSchemaError,
      } = await import("@/lib/audio-upload/stt-from-buffer");

      try {
        const transcript = await persistTranscriptFromBuffer(
          meta.assetId,
          buffer,
        );

        void (async () => {
          try {
            const { runDistillPipelineAfterStt } = await import(
              "@/lib/audio-station/distill-pipeline"
            );
            await runDistillPipelineAfterStt(meta.assetId);
          } catch (error) {
            console.error(`Distill post-STT (Vercel) ${meta.assetId}:`, error);
            if (!isPrismaSchemaError(error)) {
              await prisma.audioAsset
                .update({
                  where: { id: meta.assetId },
                  data: {
                    pipelineStation: "HITL",
                    pipelineError:
                      error instanceof Error
                        ? error.message.slice(0, 400)
                        : "distill_failed",
                  },
                })
                .catch(() => undefined);
            }
          }
        })();

        return NextResponse.json(
          {
            id: meta.assetId,
            jobId: meta.assetId,
            uploadId: meta.uploadId,
            filename: meta.filename,
            status: "COMPLETED",
            pipelineStation: "STT",
            metabolismStarted: true,
            ambientContext: meta.ambientContext,
            ok: true,
            sttMode: "in_memory",
            transcriptChars: transcript.rawText.length,
          },
          { status: 201 },
        );
      } catch (error) {
        console.error("Vercel in-memory STT failed:", error);
        const message =
          error instanceof Error ? error.message : "STT falló en memoria.";
        await prisma.audioAsset
          .update({
            where: { id: meta.assetId },
            data: {
              status: "ERROR",
              pipelineStation: "ERROR",
              pipelineError: message.slice(0, 500),
            },
          })
          .catch(() => undefined);

        return NextResponse.json(
          {
            id: meta.assetId,
            jobId: meta.assetId,
            uploadId: meta.uploadId,
            filename: meta.filename,
            status: "ERROR",
            pipelineStation: "ERROR",
            error: message,
            ok: false,
            sttMode: "in_memory",
          },
          { status: 200 },
        );
      }
    }

    const queued = processingQueue.enqueue(meta.assetId);

    return NextResponse.json(
      {
        id: meta.assetId,
        jobId: meta.assetId,
        uploadId: meta.uploadId,
        filename: meta.filename,
        status: queued ? "QUEUED" : "PENDING",
        pipelineStation: "STT",
        metabolismStarted: queued,
        ambientContext: meta.ambientContext,
        ok: true,
        sttMode: "queue",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("handleAudioUploadComplete fatal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Fallo al completar la subida.",
        ok: false,
        pipelineStation: "ERROR",
      },
      { status: 200 },
    );
  }
}
