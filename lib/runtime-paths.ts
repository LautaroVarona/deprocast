import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APP_ROOT = path.join(/* turbopackIgnore: true */ process.cwd());

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

export function getAppRoot(): string {
  return APP_ROOT;
}

function getWritableBase(): string {
  const customRoot = process.env.DEPROCAST_DATA_ROOT?.trim();
  if (customRoot) {
    return path.resolve(customRoot);
  }

  if (isVercelRuntime()) {
    return path.join(os.tmpdir(), "deprocast");
  }

  return APP_ROOT;
}

/** Raíz de `data/` (journal, projects, raw_documents, etc.). */
export function getDataRoot(): string {
  if (isVercelRuntime() || process.env.DEPROCAST_DATA_ROOT?.trim()) {
    return path.join(getWritableBase(), "data");
  }

  return path.join(APP_ROOT, "data");
}

export function getDataPath(...segments: string[]): string {
  return path.join(getDataRoot(), ...segments);
}

export function resolveDataRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/^data[\\/]/, "");
  return path.join(getDataRoot(), normalized);
}

export function getRawDocumentsPath(...segments: string[]): string {
  return getDataPath("raw_documents", ...segments);
}

export function getUploadDir(): string {
  // Local-first: data/uploads/ (y /tmp/deprocast/data/uploads en Vercel).
  return path.join(getWritableBase(), "data", "uploads");
}

/** Staging de chunks: data/uploads/tmp/{uploadId}/ */
export function getUploadStagingDir(uploadId?: string): string {
  const base = path.join(getUploadDir(), "tmp");
  return uploadId ? path.join(base, uploadId) : base;
}

export function getUploadPublicUrl(filename: string): string {
  // Siempre vía API: el FS ya no es public/uploads.
  return `/api/uploads/${filename}`;
}

export function resolveUploadPath(fileUrl: string): string {
  const apiMatch = fileUrl.match(/\/api\/uploads\/(.+)$/);
  if (apiMatch) {
    return path.join(getUploadDir(), apiMatch[1]);
  }

  const publicMatch = fileUrl.match(/\/uploads\/(.+)$/);
  if (publicMatch) {
    const inData = path.join(getUploadDir(), publicMatch[1]);
    if (fs.existsSync(inData)) {
      return inData;
    }
    // Legacy: archivos previos en public/uploads/
    return path.join(APP_ROOT, "public", "uploads", publicMatch[1]);
  }

  const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  return path.join(APP_ROOT, "public", relativePath);
}

/**
 * True when DATABASE_URL apunta a un host remoto (Turso/libSQL, Postgres, etc.).
 * En ese caso no se usa better-sqlite3 ni seed a /tmp.
 */
export function isRemoteDatabaseUrl(url = process.env.DATABASE_URL?.trim()): boolean {
  if (!url) return false;
  if (url.startsWith("file:")) return false;
  return /^(libsql|https?|postgres(ql)?|prisma\+postgres|mysql):\/\//i.test(url);
}

/** SQLite en /tmp de Vercel sin DEPROCAST_DATA_ROOT — no sobrevive cold starts. */
export function usesEphemeralSqlite(): boolean {
  if (isRemoteDatabaseUrl()) return false;
  if (process.env.DEPROCAST_DATA_ROOT?.trim()) return false;
  return isVercelRuntime();
}

/**
 * True when Atanor debe tratar SQLite (AtanorProject) como SSOT de lectura,
 * no solo los .md del filesystem (efímero en Vercel).
 */
export function prefersSqliteProjectStore(): boolean {
  return isVercelRuntime() || Boolean(process.env.DEPROCAST_DATA_ROOT?.trim());
}

export function getDatabaseFilePath(): string {
  if (isRemoteDatabaseUrl()) {
    throw new Error(
      "DATABASE_URL remota detectada: getDatabaseFilePath solo aplica a SQLite file:. Usá getDatabaseUrl().",
    );
  }

  const envUrl = process.env.DATABASE_URL?.trim();

  if (envUrl?.startsWith("file:")) {
    const filePath = envUrl.slice("file:".length);
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    if (isVercelRuntime()) {
      // Con DEPROCAST_DATA_ROOT el path relativo cae en el mount persistente.
      return path.join(getWritableBase(), filePath.replace(/^\.\//, ""));
    }

    return path.join(APP_ROOT, filePath);
  }

  if (isVercelRuntime()) {
    return path.join(getWritableBase(), "deprocast.db");
  }

  return path.join(APP_ROOT, "prisma", "dev.db");
}

export function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl && isRemoteDatabaseUrl(envUrl)) {
    return envUrl;
  }

  // Forward slashes: URI file: estable en Windows para el adapter better-sqlite3.
  return `file:${getDatabaseFilePath().replace(/\\/g, "/")}`;
}

export function getDatabaseSeedPath(): string {
  const bundledSeed = path.join(APP_ROOT, "lib", "db", "vercel-build.db");
  if (fs.existsSync(bundledSeed)) {
    return bundledSeed;
  }

  return path.join(APP_ROOT, "prisma", "vercel-build.db");
}

export async function ensureRuntimeDirs(): Promise<void> {
  const dirs = [
    getWritableBase(),
    getDataRoot(),
    getUploadDir(),
    getRawDocumentsPath("pending"),
    getRawDocumentsPath("completed"),
    getRawDocumentsPath("pending_purification"),
    getRawDocumentsPath("review"),
    getDataPath("journal"),
    getDataPath("projects"),
    getDataPath("cam-recorder-watcher"),
    getDataPath("tacho"),
    getDataPath("tacho", "notas"),
    getDataPath("projects", "laboral", "pending"),
    getDataPath("memory"),
    getDataPath("memory", "sessions"),
    getDataPath("memory", "knowledge"),
    getDataPath("memory", "knowledge", "translators"),
  ];

  if (!isRemoteDatabaseUrl()) {
    dirs.push(path.dirname(getDatabaseFilePath()));
  }

  await Promise.all(
    dirs.map(async (dir) => {
      await fs.promises.mkdir(dir, { recursive: true });
    }),
  );
}
