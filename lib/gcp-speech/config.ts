import "dotenv/config";

import {
  readProjectIdFromCredentials,
  resolveGcpCredentialsPath,
} from "@/lib/gcp-credentials";

export type GcpSpeechConfig = {
  projectId: string;
  credentialsPath: string;
  location: string;
  model: string;
  language: string;
  chunkSeconds: number;
  syncMaxSeconds: number;
  recognizer: string;
  apiEndpoint: string;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let cachedConfig: GcpSpeechConfig | null = null;

export function getGcpSpeechConfig(): GcpSpeechConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const credentialsPath = resolveGcpCredentialsPath({
    pathEnvName: "GOOGLE_APPLICATION_CREDENTIALS",
    jsonEnvName: "GCP_SPEECH_CREDENTIALS_JSON",
    cacheFileName: "speech-credentials.json",
    missingMessage:
      "Falta GOOGLE_APPLICATION_CREDENTIALS o GCP_SPEECH_CREDENTIALS_JSON. Configurá las credenciales de Speech-to-Text.",
    notFoundMessage: (resolved) =>
      `No se encontró el archivo de credenciales: ${resolved}`,
  });

  const projectIdFromFile = readProjectIdFromCredentials(
    credentialsPath,
    "Speech",
  );
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() || projectIdFromFile;

  if (
    process.env.GOOGLE_CLOUD_PROJECT?.trim() &&
    process.env.GOOGLE_CLOUD_PROJECT.trim() !== projectIdFromFile
  ) {
    console.warn(
      `GOOGLE_CLOUD_PROJECT (${process.env.GOOGLE_CLOUD_PROJECT}) difiere del project_id del JSON (${projectIdFromFile}). Usando ${projectId}.`,
    );
  }

  const location = process.env.GCP_SPEECH_LOCATION?.trim() || "us-central1";
  const model = process.env.GCP_SPEECH_MODEL?.trim() || "chirp_2";
  const language = process.env.GCP_SPEECH_LANGUAGE?.trim() || "es-ES";
  const chunkSeconds = parsePositiveInt(
    process.env.GCP_SPEECH_CHUNK_SECONDS,
    50,
  );
  const syncMaxSeconds = parsePositiveInt(
    process.env.GCP_SPEECH_SYNC_MAX_SECONDS,
    55,
  );

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  }

  cachedConfig = {
    projectId,
    credentialsPath,
    location,
    model,
    language,
    chunkSeconds,
    syncMaxSeconds,
    recognizer: `projects/${projectId}/locations/${location}/recognizers/_`,
    apiEndpoint: `${location}-speech.googleapis.com`,
  };

  return cachedConfig;
}
