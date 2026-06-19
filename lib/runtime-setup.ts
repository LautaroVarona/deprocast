import fs from "node:fs";
import path from "node:path";

import {
  ensureRuntimeDirs,
  getDatabaseFilePath,
  getDatabaseSeedPath,
  isVercelRuntime,
} from "@/lib/runtime-paths";

let setupPromise: Promise<void> | null = null;

const SQLITE_MAGIC = "SQLite format 3";

function isValidSqliteFile(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const stat = fs.statSync(dbPath);
    if (stat.size < 1024) {
      return false;
    }

    const header = Buffer.alloc(SQLITE_MAGIC.length);
    const fd = fs.openSync(dbPath, "r");

    try {
      fs.readSync(fd, header, 0, header.length, 0);
    } finally {
      fs.closeSync(fd);
    }

    return header.toString("utf8") === SQLITE_MAGIC;
  } catch {
    return false;
  }
}

async function copySeedDatabase(targetPath: string, seedPath: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

  if (fs.existsSync(targetPath)) {
    await fs.promises.unlink(targetPath);
  }

  await fs.promises.copyFile(seedPath, targetPath);

  if (!isValidSqliteFile(targetPath)) {
    throw new Error(
      "La copia de prisma/vercel-build.db a /tmp falló o el archivo está corrupto.",
    );
  }
}

async function ensureDatabase(): Promise<void> {
  if (!isVercelRuntime()) {
    return;
  }

  const targetPath = getDatabaseFilePath();
  if (isValidSqliteFile(targetPath)) {
    return;
  }

  const seedPath = getDatabaseSeedPath();
  if (!fs.existsSync(seedPath)) {
    throw new Error(
      "Falta prisma/vercel-build.db en el deploy. Configurá Build Command: npm run vercel-build.",
    );
  }

  await copySeedDatabase(targetPath, seedPath);
}

export async function ensureRuntimeReady(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      await ensureRuntimeDirs();
      await ensureDatabase();
    })().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
}
