import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APP_ROOT = path.join(/* turbopackIgnore: true */ process.cwd());

type ResolveCredentialsOptions = {
  pathEnvName: string;
  jsonEnvName: string;
  cacheFileName: string;
  missingMessage: string;
  notFoundMessage: (resolvedPath: string) => string;
};

function getCredentialsCacheDir(): string {
  return path.join(os.tmpdir(), "deprocast", "credentials");
}

function writeCredentialsFromJson(
  jsonRaw: string,
  cacheFileName: string,
): string {
  const cacheDir = getCredentialsCacheDir();
  fs.mkdirSync(cacheDir, { recursive: true });

  const targetPath = path.join(cacheDir, cacheFileName);
  fs.writeFileSync(targetPath, jsonRaw, "utf-8");
  return targetPath;
}

export function resolveGcpCredentialsPath(
  options: ResolveCredentialsOptions,
): string {
  const jsonRaw = process.env[options.jsonEnvName]?.trim();
  if (jsonRaw) {
    const targetPath = writeCredentialsFromJson(jsonRaw, options.cacheFileName);
    process.env[options.pathEnvName] = targetPath;
    return targetPath;
  }

  if (process.env.VERCEL === "1") {
    throw new Error(
      `${options.missingMessage} En Vercel usá ${options.jsonEnvName} con el JSON completo.`,
    );
  }

  const raw = process.env[options.pathEnvName];
  if (!raw?.trim()) {
    throw new Error(options.missingMessage);
  }

  const resolved = path.isAbsolute(raw)
    ? raw
    : path.join(APP_ROOT, raw.replace(/^\.\//, ""));

  if (!fs.existsSync(resolved)) {
    throw new Error(options.notFoundMessage(resolved));
  }

  return resolved;
}

export function readProjectIdFromCredentials(
  credentialsPath: string,
  errorLabel: string,
): string {
  try {
    const raw = fs.readFileSync(credentialsPath, "utf-8");
    const parsed = JSON.parse(raw) as { project_id?: string };
    if (!parsed.project_id) {
      throw new Error(`El JSON de credenciales ${errorLabel} no contiene project_id.`);
    }
    return parsed.project_id;
  } catch (error) {
    if (error instanceof Error && error.message.includes("project_id")) {
      throw error;
    }
    throw new Error(
      `No se pudo leer el JSON de credenciales ${errorLabel}: ${credentialsPath}`,
    );
  }
}
