import "dotenv/config";
import fs from "fs";
import path from "path";
import { GcpSpeechError } from "@/lib/gcp-speech/errors";

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

function resolveCredentialsPath(): string {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw?.trim()) {
    throw new GcpSpeechError(
      "Falta GOOGLE_APPLICATION_CREDENTIALS. Configúrala en .env apuntando al JSON de la cuenta de servicio.",
    );
  }

  const resolved = path.isAbsolute(raw)
    ? raw
    : path.resolve(process.cwd(), raw);

  if (!fs.existsSync(resolved)) {
    throw new GcpSpeechError(
      `No se encontró el archivo de credenciales: ${resolved}`,
    );
  }

  return resolved;
}

function readProjectIdFromCredentials(credentialsPath: string): string {
  try {
    const raw = fs.readFileSync(credentialsPath, "utf-8");
    const parsed = JSON.parse(raw) as { project_id?: string };
    if (!parsed.project_id) {
      throw new GcpSpeechError(
        "El JSON de credenciales no contiene project_id.",
      );
    }
    return parsed.project_id;
  } catch (error) {
    if (error instanceof GcpSpeechError) {
      throw error;
    }
    throw new GcpSpeechError(
      `No se pudo leer el JSON de credenciales: ${credentialsPath}`,
    );
  }
}

let cachedConfig: GcpSpeechConfig | null = null;

export function getGcpSpeechConfig(): GcpSpeechConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const credentialsPath = resolveCredentialsPath();
  const projectIdFromFile = readProjectIdFromCredentials(credentialsPath);
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
