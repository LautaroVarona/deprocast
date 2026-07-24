import {
  isCancelled,
  ProcessingCancelledError,
} from "@/lib/processing-cancellation";
import { isQueuePaused } from "@/lib/processing-queue-control";
import {
  getAudioDurationSeconds,
  splitIntoChunks,
} from "@/lib/stt/audio-prep";
import { getDeepgramConfig } from "@/lib/deepgram/config";
import { logInfo, updatePartialText } from "@/lib/deepgram/logger";
import {
  isEmptyDeepgramTranscriptionError,
  PartialTranscriptionError,
} from "@/lib/deepgram/errors";
import { pauseBetweenChunks } from "@/lib/deepgram/retry";
import {
  transcribeSync,
  type TranscriptionResult,
} from "@/lib/deepgram/transcribe-sync";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Espera mientras la cola esté pausada; respeta cancelación del asset. */
async function waitWhileQueuePaused(assetId: string): Promise<void> {
  let announced = false;
  while (isQueuePaused()) {
    if (isCancelled(assetId)) {
      throw new ProcessingCancelledError();
    }
    if (!announced) {
      logInfo(
        assetId,
        "Cola pausada — no se envían más segmentos a Deepgram hasta reanudar.",
      );
      announced = true;
    }
    await sleep(500);
  }
}

function averageConfidence(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null);
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export async function transcribeChunked(
  assetId: string,
  wavPath: string,
  tempDir: string,
): Promise<TranscriptionResult> {
  const config = getDeepgramConfig();
  const duration = await getAudioDurationSeconds(wavPath);
  const estimatedChunks = Math.max(
    1,
    Math.ceil(duration / config.chunkSeconds),
  );

  logInfo(
    assetId,
    `Audio largo (${Math.round(duration)}s): dividiendo en segmentos de ~${config.chunkSeconds}s (estimado: ${estimatedChunks})...`,
  );

  const chunkPaths = await splitIntoChunks(
    wavPath,
    tempDir,
    config.chunkSeconds,
  );
  const totalChunks = chunkPaths.length;

  logInfo(assetId, `Generados ${totalChunks} segmentos para transcripción.`);

  const segments: string[] = [];
  const confidences: Array<number | null> = [];
  let skippedEmptyChunks = 0;

  for (let index = 0; index < chunkPaths.length; index += 1) {
    if (isCancelled(assetId)) {
      throw new ProcessingCancelledError();
    }

    await waitWhileQueuePaused(assetId);

    const chunkNumber = index + 1;
    const chunkPath = chunkPaths[index];

    logInfo(
      assetId,
      `Segmento ${chunkNumber}/${totalChunks} — enviando a Deepgram...`,
    );

    try {
      const result = await transcribeSync(assetId, chunkPath);
      segments.push(result.rawText);
      confidences.push(result.confidence);

      const partialText = segments.join(" ").trim();
      await updatePartialText(assetId, partialText).catch((error) => {
        console.warn(
          `No se pudo actualizar partialText de ${assetId}:`,
          error,
        );
      });

      logInfo(
        assetId,
        `Segmento ${chunkNumber}/${totalChunks} — OK (${result.rawText.length} chars)`,
      );

      if (chunkNumber < totalChunks) {
        await pauseBetweenChunks(assetId);
      }
    } catch (error) {
      if (isEmptyDeepgramTranscriptionError(error)) {
        skippedEmptyChunks += 1;
        logInfo(
          assetId,
          `Segmento ${chunkNumber}/${totalChunks} — vacío; se omite y se continúa.`,
        );
        if (chunkNumber < totalChunks) {
          await pauseBetweenChunks(assetId);
        }
        continue;
      }

      const partialText = segments.join(" ").trim();
      if (partialText) {
        throw new PartialTranscriptionError(error, {
          rawText: partialText,
          confidence: averageConfidence(confidences),
          completedChunks: segments.length,
          totalChunks,
        });
      }
      throw error;
    }
  }

  const rawText = segments.join(" ").trim();
  if (!rawText) {
    throw new Error(
      skippedEmptyChunks > 0
        ? `La transcripción quedó vacía: ${skippedEmptyChunks}/${totalChunks} segmentos devolvieron texto vacío.`
        : "La transcripción por segmentos quedó vacía tras procesar todos los chunks.",
    );
  }

  if (skippedEmptyChunks > 0) {
    logInfo(
      assetId,
      `Transcripción completada con ${skippedEmptyChunks}/${totalChunks} segmentos vacíos omitidos.`,
    );
  }

  return {
    rawText,
    confidence: averageConfidence(confidences),
  };
}
