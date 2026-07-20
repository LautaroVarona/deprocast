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
  if (isVercelRuntime() || process.env.DEPROCAST_DATA_ROOT?.trim()) {
    return path.join(getWritableBase(), "uploads");
  }

  return path.join(APP_ROOT, "public", "uploads");
}

export function getUploadPublicUrl(filename: string): string {
  if (isVercelRuntime() || process.env.DEPROCAST_DATA_ROOT?.trim()) {
    return `/api/uploads/${filename}`;
  }

  return `/uploads/${filename}`;
}

export function resolveUploadPath(fileUrl: string): string {
  const apiMatch = fileUrl.match(/\/api\/uploads\/(.+)$/);
  if (apiMatch) {
    return path.join(getUploadDir(), apiMatch[1]);
  }

  const publicMatch = fileUrl.match(/\/uploads\/(.+)$/);
  if (publicMatch) {
    return path.join(getUploadDir(), publicMatch[1]);
  }

  const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  return path.join(APP_ROOT, "public", relativePath);
}

export function getDatabaseFilePath(): string {
  const envUrl = process.env.DATABASE_URL?.trim();

  if (envUrl?.startsWith("file:")) {
    const filePath = envUrl.slice("file:".length);
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    if (isVercelRuntime()) {
      return path.join(getWritableBase(), "deprocast.db");
    }

    return path.join(APP_ROOT, filePath);
  }

  if (isVercelRuntime()) {
    return path.join(getWritableBase(), "deprocast.db");
  }

  return path.join(APP_ROOT, "prisma", "dev.db");
}

export function getDatabaseUrl(): string {
  return `file:${getDatabaseFilePath()}`;
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
    path.dirname(getDatabaseFilePath()),
  ];

  await Promise.all(
    dirs.map(async (dir) => {
      await fs.promises.mkdir(dir, { recursive: true });
    }),
  );
}
