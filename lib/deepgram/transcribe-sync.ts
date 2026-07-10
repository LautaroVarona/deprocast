import { createReadStream } from "fs";
import { getDeepgramClient } from "@/lib/deepgram/client";
import { getDeepgramConfig } from "@/lib/deepgram/config";
import {
  DeepgramSpeechError,
  humanizeDeepgramError,
} from "@/lib/deepgram/errors";
import { logInfo } from "@/lib/deepgram/logger";
import { withDeepgramRetry } from "@/lib/deepgram/retry";

export type TranscriptionResult = {
  rawText: string;
  confidence: number | null;
};

type DeepgramAlternative = {
  transcript?: string | null;
  confidence?: number | null;
};

type DeepgramTranscribeResponse = {
  results?: {
    channels?: Array<{
      alternatives?: DeepgramAlternative[] | null;
    }> | null;
  } | null;
};

function isTranscriptionResponse(
  response: unknown,
): response is DeepgramTranscribeResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "results" in response
  );
}

function extractResult(response: unknown): TranscriptionResult {
  if (!isTranscriptionResponse(response)) {
    throw new DeepgramSpeechError(
      "Deepgram devolvió una respuesta async o inválida en lugar de la transcripción.",
    );
  }

  const alternatives =
    response.results?.channels?.[0]?.alternatives ?? [];
  const segments: string[] = [];
  const confidences: number[] = [];

  for (const alternative of alternatives) {
    const transcript = alternative.transcript?.trim();
    if (transcript) {
      segments.push(transcript);
    }
    if (typeof alternative.confidence === "number") {
      confidences.push(alternative.confidence);
    }
  }

  const rawText = segments.join(" ").trim();
  if (!rawText) {
    throw new DeepgramSpeechError(
      "Deepgram devolvió una transcripción vacía.",
    );
  }

  const confidence =
    confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : null;

  return { rawText, confidence };
}

async function transcribeFile(
  assetId: string,
  wavPath: string,
): Promise<TranscriptionResult> {
  const config = getDeepgramConfig();
  const client = getDeepgramClient();

  logInfo(assetId, "Enviando audio a Deepgram (transcribeFile)...");

  try {
    const response = await client.listen.v1.media.transcribeFile(
      createReadStream(wavPath),
      {
        model: config.model,
        language: config.language,
        punctuate: true,
        smart_format: true,
      },
    );

    return extractResult(response);
  } catch (error) {
    throw new DeepgramSpeechError(
      humanizeDeepgramError(error),
      (error as Error & { statusCode?: number }).statusCode,
    );
  }
}

export async function transcribeSync(
  assetId: string,
  wavPath: string,
): Promise<TranscriptionResult> {
  return withDeepgramRetry(assetId, "Deepgram API", () =>
    transcribeFile(assetId, wavPath),
  );
}
