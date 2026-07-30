import {
  assembleChunks,
  cleanupStaging,
  readMeta,
  writeFinalAudio,
} from "@/lib/audio-upload/staging";
import { processingQueue } from "@/lib/processing-queue";
import { prisma } from "@/lib/prisma";
import { isVercelRuntime } from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
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

    // Siempre escribir a disco (data/uploads o /tmp) para que la cola STT
    // existente pueda resolver fileUrl. En Vercel el FS es efímero: STT
    // debe correr en la misma invocación / cola inmediata.
    await writeFinalAudio(storedFilename, buffer);

    await prisma.audioAsset.update({
      where: { id: meta.assetId },
      data: {
        pipelineStation: "STT",
        pipelineError: null,
        status: "PENDING",
        // ambientContext vive en OriginAttribution (LINEAGE); guardamos hint en partialText no.
      },
    });

    // Persistir ambientContext en un sidecar ligero vía metadata Babel no es
    // suficiente para LINEAGE: lo guardamos en el filename staging cleanup
    // y lo re-leemos desde meta antes de borrar.
    const ambientContext = meta.ambientContext;

    // Adjuntar ambient al asset via update de un campo JSON no existe;
    // usamos pipelineError null + store en OriginAttribution en distill.
    // Pasamos ambientContext a través de un archivo pequeño junto al audio.
    const { writeFile, mkdir } = await import("fs/promises");
    const { getUploadDir } = await import("@/lib/runtime-paths");
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    await writeFile(
      path.join(uploadDir, `${meta.assetId}.meta.json`),
      JSON.stringify({ ambientContext, uploadId }),
      "utf8",
    );

    await cleanupStaging(uploadId);

    const queued = processingQueue.enqueue(meta.assetId);

    // En Vercel, la cola in-memory puede morir; el complete ya dejó PENDING
    // y reclaimAndDrain en cold start recupera. Disparar hint serverless.
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
  } catch (error) {
    console.error("Upload complete error:", error);
    return NextResponse.json(
      { error: "No se pudo completar la subida." },
      { status: 500 },
    );
  }
}
