import {
  isCancelled,
  ProcessingCancelledError,
  registerActiveJob,
  unregisterActiveJob,
} from "@/lib/processing-cancellation";
import { prisma } from "@/lib/prisma";
import {
  convertToWav,
  getAudioDurationSeconds,
  logFfmpegBinaryInUse,
  removeFile,
  removeTempDir,
  resolveInputPath,
} from "@/lib/stt/audio-prep";
import { getDeepgramConfig } from "@/lib/deepgram/config";
import {
  humanizeDeepgramError,
  PartialTranscriptionError,
} from "@/lib/deepgram/errors";
import { logError, logInfo } from "@/lib/deepgram/logger";
import { transcribeChunked } from "@/lib/deepgram/transcribe-chunked";
import { transcribeSync } from "@/lib/deepgram/transcribe-sync";
import fs from "fs";
import os from "os";
import path from "path";

async function markAssetError(assetId: string, reason: string): Promise<void> {
  logError(assetId, `Marcando AudioAsset como ERROR: ${reason}`);
  await prisma.audioAsset
    .update({
      where: { id: assetId },
      data: { status: "ERROR", partialText: null },
    })
    .catch((error) => {
      logError(assetId, "No se pudo actualizar el estado a ERROR", error);
    });
}

async function savePartialTranscript(
  assetId: string,
  partial: {
    rawText: string;
    confidence: number | null;
    completedChunks: number;
    totalChunks: number;
  },
  reason: string,
): Promise<void> {
  const note =
    `\n\n---\n\n*[Transcripción parcial: ${partial.completedChunks}/${partial.totalChunks} segmentos. ${reason}]*`;

  await prisma.$transaction(async (tx) => {
    await tx.transcript.deleteMany({ where: { assetId } });

    await tx.transcript.create({
      data: {
        assetId,
        rawText: `${partial.rawText}${note}`,
        confidence: partial.confidence,
      },
    });

    await tx.audioAsset.update({
      where: { id: assetId },
      data: {
        status: "ERROR",
        partialText: partial.rawText,
      },
    });
  });

  logInfo(
    assetId,
    `Transcripción parcial guardada (${partial.completedChunks}/${partial.totalChunks} segmentos, ${partial.rawText.length} chars). Podés descargarla en .md y reintentar después.`,
  );
}

export async function processAssetDeepgram(assetId: string): Promise<void> {
  const tempDir = path.resolve(os.tmpdir(), "deprocast", assetId);
  const wavPath = path.resolve(tempDir, `${assetId}.wav`);
  let inputPath: string | null = null;

  registerActiveJob(assetId, () => {
    // La cancelación se verifica entre segmentos; no hay proceso hijo que abortar.
  });

  try {
    getDeepgramConfig();
    logInfo(assetId, "Iniciando transcripción Deepgram...");

    const asset = await prisma.audioAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new Error(`AudioAsset ${assetId} no encontrado`);
    }

    inputPath = resolveInputPath(asset.fileUrl);
    logInfo(assetId, `Ruta de entrada resuelta: ${inputPath}`);

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Archivo de entrada no encontrado en disco: ${inputPath}`);
    }

    fs.mkdirSync(tempDir, { recursive: true });
    logInfo(assetId, `Directorio temporal creado: ${tempDir}`);

    if (isCancelled(assetId)) {
      throw new ProcessingCancelledError();
    }

    logFfmpegBinaryInUse();
    logInfo(assetId, "Iniciando conversión FFmpeg a WAV 16kHz mono...");
    await convertToWav(inputPath, wavPath);

    const wavStats = fs.statSync(wavPath);
    const duration = await getAudioDurationSeconds(wavPath);
    const config = getDeepgramConfig();

    logInfo(
      assetId,
      `WAV generado (${(wavStats.size / (1024 * 1024)).toFixed(2)} MB, ${Math.round(duration)}s)`,
    );

    if (isCancelled(assetId)) {
      throw new ProcessingCancelledError();
    }

    const useChunked = duration > config.syncMaxSeconds;
    const transcription = useChunked
      ? await transcribeChunked(assetId, wavPath, tempDir)
      : await transcribeSync(assetId, wavPath);

    if (!transcription.rawText.trim()) {
      throw new Error("La transcripción está vacía tras el procesamiento Deepgram.");
    }

    logInfo(
      assetId,
      `Transcripción completa (${transcription.rawText.length} chars), guardando en base de datos...`,
    );

    await prisma.$transaction(async (tx) => {
      await tx.transcript.deleteMany({ where: { assetId } });

      await tx.transcript.create({
        data: {
          assetId,
          rawText: transcription.rawText,
          confidence: transcription.confidence,
        },
      });

      await tx.audioAsset.update({
        where: { id: assetId },
        data: { status: "COMPLETED", partialText: null },
      });
    });

    logInfo(assetId, "Transcripción guardada. Iniciando limpieza de archivos...");

    removeFile(wavPath, "WAV temporal");
    if (inputPath) {
      removeFile(inputPath, "archivo de entrada original");
    }
  } catch (error) {
    if (error instanceof ProcessingCancelledError || isCancelled(assetId)) {
      logInfo(assetId, "Procesamiento cancelado por el usuario.");
      await prisma.audioAsset
        .update({
          where: { id: assetId },
          data: { status: "PENDING", partialText: null },
        })
        .catch(() => undefined);
      return;
    }

    if (error instanceof PartialTranscriptionError) {
      const message = humanizeDeepgramError(error);
      logError(assetId, `Transcripción interrumpida: ${message}`, error);
      await savePartialTranscript(assetId, error.partial, message);
      return;
    }

    const message = humanizeDeepgramError(error);
    logError(assetId, `Error procesando audio: ${message}`, error);
    await markAssetError(assetId, message);
  } finally {
    unregisterActiveJob(assetId);
    removeFile(wavPath, "WAV residual");
    removeTempDir(tempDir);
  }
}
