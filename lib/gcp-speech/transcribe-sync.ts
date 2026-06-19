import fs from "fs";
import { v1, v2 } from "@google-cloud/speech";
import { getSpeechClient } from "@/lib/gcp-speech/client";
import { getGcpSpeechConfig } from "@/lib/gcp-speech/config";
import {
  formatGcpError,
  GcpSpeechError,
  humanizeGcpSpeechError,
} from "@/lib/gcp-speech/errors";
import { logInfo } from "@/lib/gcp-speech/logger";
import { withGcpRetry } from "@/lib/gcp-speech/retry";

export type TranscriptionResult = {
  rawText: string;
  confidence: number | null;
};

type V2RecognizeResponse = {
  results?: Array<{
    alternatives?: Array<{
      transcript?: string | null;
      confidence?: number | null;
    }> | null;
  }> | null;
};

function extractV2Result(response: V2RecognizeResponse): TranscriptionResult {
  const results = response.results ?? [];
  const segments: string[] = [];
  const confidences: number[] = [];

  for (const result of results) {
    const alternative = result.alternatives?.[0];
    const transcript = alternative?.transcript?.trim();
    if (transcript) {
      segments.push(transcript);
    }
    if (typeof alternative?.confidence === "number") {
      confidences.push(alternative.confidence);
    }
  }

  const rawText = segments.join(" ").trim();
  if (!rawText) {
    throw new GcpSpeechError(
      "La API de Speech devolvió una transcripción vacía.",
    );
  }

  const confidence =
    confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : null;

  return { rawText, confidence };
}

async function recognizeWithV2(
  assetId: string,
  audioBuffer: Buffer,
): Promise<TranscriptionResult> {
  const config = getGcpSpeechConfig();
  const client = getSpeechClient();

  logInfo(assetId, "Enviando audio a Speech-to-Text V2 (recognize)...");

  const [response] = await client.recognize({
    recognizer: config.recognizer,
    config: {
      autoDecodingConfig: {},
      languageCodes: [config.language],
      model: config.model,
    },
    content: audioBuffer,
  });

  return extractV2Result(response);
}

async function recognizeWithV1Fallback(
  assetId: string,
  audioBuffer: Buffer,
): Promise<TranscriptionResult> {
  const config = getGcpSpeechConfig();
  const client = new v1.SpeechClient();

  logInfo(
    assetId,
    "Reintentando con Speech-to-Text V1 (latest_long) como fallback...",
  );

  const [response] = await client.recognize({
    config: {
      encoding: "LINEAR16",
      sampleRateHertz: 16000,
      languageCode: config.language,
      model: "latest_long",
      enableAutomaticPunctuation: true,
    },
    audio: {
      content: audioBuffer,
    },
  });

  const segments: string[] = [];
  const confidences: number[] = [];

  for (const result of response.results ?? []) {
    const alternative = result.alternatives?.[0];
    const transcript = alternative?.transcript?.trim();
    if (transcript) {
      segments.push(transcript);
    }
    if (typeof alternative?.confidence === "number") {
      confidences.push(alternative.confidence);
    }
  }

  const rawText = segments.join(" ").trim();
  if (!rawText) {
    throw new GcpSpeechError(
      "El fallback V1 devolvió una transcripción vacía.",
    );
  }

  const confidence =
    confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : null;

  return { rawText, confidence };
}

async function transcribeBuffer(
  assetId: string,
  audioBuffer: Buffer,
): Promise<TranscriptionResult> {
  try {
    return await recognizeWithV2(assetId, audioBuffer);
  } catch (error) {
    const message = formatGcpError(error);
    const shouldFallback =
      /not found|unavailable|invalid argument|model/i.test(message);

    if (!shouldFallback) {
      throw new GcpSpeechError(
        humanizeGcpSpeechError(error),
        (error as Error & { code?: string | number }).code,
      );
    }

    logInfo(assetId, `V2 no disponible (${message}), probando fallback V1...`);

    try {
      return await recognizeWithV1Fallback(assetId, audioBuffer);
    } catch (fallbackError) {
      throw new GcpSpeechError(
        humanizeGcpSpeechError(fallbackError),
        (fallbackError as Error & { code?: string | number }).code,
      );
    }
  }
}

export async function transcribeSync(
  assetId: string,
  wavPath: string,
): Promise<TranscriptionResult> {
  const audioBuffer = fs.readFileSync(wavPath);
  const maxInlineBytes = 10 * 1024 * 1024;

  if (audioBuffer.byteLength > maxInlineBytes) {
    throw new GcpSpeechError(
      `El audio (${audioBuffer.byteLength} bytes) supera el límite inline de 10 MB. ` +
        "Se requiere segmentación para archivos grandes.",
    );
  }

  return withGcpRetry(assetId, "Speech API", () =>
    transcribeBuffer(assetId, audioBuffer),
  );
}
