import "dotenv/config";

import {
  readProjectIdFromCredentials,
  resolveGcpCredentialsPath,
} from "@/lib/gcp-credentials";
import { VertexGeminiError } from "@/lib/vertex-gemini/errors";

export type VertexGeminiConfig = {
  projectId: string;
  credentialsPath: string;
  location: string;
  model: string;
};

let cachedConfig: VertexGeminiConfig | null = null;

export function getVertexGeminiConfig(): VertexGeminiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const credentialsPath = resolveGcpCredentialsPath({
      pathEnvName: "GOOGLE_APPLICATION_CREDENTIALS2",
      jsonEnvName: "VERTEX_CREDENTIALS_JSON",
      cacheFileName: "vertex-credentials.json",
      missingMessage:
        "Falta GOOGLE_APPLICATION_CREDENTIALS2 o VERTEX_CREDENTIALS_JSON. Configurá las credenciales de Vertex AI.",
      notFoundMessage: (resolved) =>
        `No se encontró el archivo de credenciales Vertex: ${resolved}`,
    });

    const projectIdFromFile = readProjectIdFromCredentials(
      credentialsPath,
      "Vertex",
    );
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
  } catch (error) {
    if (error instanceof Error) {
      throw new VertexGeminiError(error.message);
    }
    throw error;
  }
}
