import {
  isCancelled,
  ProcessingCancelledError,
} from "@/lib/processing-cancellation";
import {
  getAudioDurationSeconds,
  splitIntoChunks,
} from "@/lib/gcp-speech/audio-prep";
import { getGcpSpeechConfig } from "@/lib/gcp-speech/config";
import { logInfo, updatePartialText } from "@/lib/gcp-speech/logger";
import { PartialTranscriptionError } from "@/lib/gcp-speech/errors";
import { pauseBetweenChunks } from "@/lib/gcp-speech/retry";
import {
  transcribeSync,
  type TranscriptionResult,
} from "@/lib/gcp-speech/transcribe-sync";

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
  const config = getGcpSpeechConfig();
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

  for (let index = 0; index < chunkPaths.length; index += 1) {
    if (isCancelled(assetId)) {
      throw new ProcessingCancelledError();
    }

    const chunkNumber = index + 1;
    const chunkPath = chunkPaths[index];

    logInfo(
      assetId,
      `Segmento ${chunkNumber}/${totalChunks} — enviando a Speech API...`,
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
      "La transcripción por segmentos quedó vacía tras procesar todos los chunks.",
    );
  }

  return {
    rawText,
    confidence: averageConfidence(confidences),
  };
}
