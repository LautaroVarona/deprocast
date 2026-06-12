import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { VertexGeminiError } from "@/lib/vertex-gemini/errors";

export type VertexGeminiConfig = {
  projectId: string;
  credentialsPath: string;
  location: string;
  model: string;
};

function readProjectIdFromCredentials(credentialsPath: string): string {
  try {
    const raw = fs.readFileSync(credentialsPath, "utf-8");
    const parsed = JSON.parse(raw) as { project_id?: string };
    if (!parsed.project_id) {
      throw new VertexGeminiError(
        "El JSON de credenciales Vertex no contiene project_id.",
      );
    }
    return parsed.project_id;
  } catch (error) {
    if (error instanceof VertexGeminiError) {
      throw error;
    }
    throw new VertexGeminiError(
      `No se pudo leer el JSON de credenciales Vertex: ${credentialsPath}`,
    );
  }
}

function resolveCredentialsPath(): string {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS2;
  if (!raw?.trim()) {
    throw new VertexGeminiError(
      "Falta GOOGLE_APPLICATION_CREDENTIALS2. Configúrala en .env apuntando al JSON de la cuenta de servicio Vertex (varonapi).",
    );
  }

  const resolved = path.isAbsolute(raw)
    ? raw
    : path.resolve(process.cwd(), raw);

  if (!fs.existsSync(resolved)) {
    throw new VertexGeminiError(
      `No se encontró el archivo de credenciales Vertex: ${resolved}`,
    );
  }

  return resolved;
}

let cachedConfig: VertexGeminiConfig | null = null;

export function getVertexGeminiConfig(): VertexGeminiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const credentialsPath = resolveCredentialsPath();
  const projectIdFromFile = readProjectIdFromCredentials(credentialsPath);
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT2?.trim() || projectIdFromFile;

  if (
    process.env.GOOGLE_CLOUD_PROJECT2?.trim() &&
    process.env.GOOGLE_CLOUD_PROJECT2.trim() !== projectIdFromFile
  ) {
    console.warn(
      `GOOGLE_CLOUD_PROJECT2 (${process.env.GOOGLE_CLOUD_PROJECT2}) difiere del project_id del JSON (${projectIdFromFile}). Usando ${projectId}.`,
    );
  }

  const location = process.env.VERTEX_LOCATION?.trim() || "europe-west1";
  const model = process.env.VERTEX_MODEL?.trim() || "gemini-2.5-flash";

  cachedConfig = {
    projectId,
    credentialsPath,
    location,
    model,
  };

  return cachedConfig;
}
