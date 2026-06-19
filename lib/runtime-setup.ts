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
const SCHEMA_MARKER = "AudioAsset";

export function databaseHasAppSchema(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const stat = fs.statSync(dbPath);
    if (stat.size < 1024) {
      return false;
    }

    const file = fs.readFileSync(dbPath);
    const header = file.subarray(0, SQLITE_MAGIC.length).toString("utf8");

    return header === SQLITE_MAGIC && file.includes(SCHEMA_MARKER);
  } catch {
    return false;
  }
}

async function copySeedDatabase(targetPath: string, seedPath: string): Promise<void> {
  if (!databaseHasAppSchema(seedPath)) {
    throw new Error(
      "El seed SQLite del deploy no contiene el esquema de Deprocast. Revisá que el build use npm run vercel-build.",
    );
  }

  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

  if (fs.existsSync(targetPath)) {
    await fs.promises.unlink(targetPath);
  }

  await fs.promises.copyFile(seedPath, targetPath);

  if (!databaseHasAppSchema(targetPath)) {
    throw new Error(
      "La copia de vercel-build.db a /tmp falló o quedó sin tablas de la app.",
    );
  }

  const { resetPrismaClient } = await import("@/lib/prisma");
  resetPrismaClient();
}

async function ensureDatabase(): Promise<void> {
  if (!isVercelRuntime()) {
    return;
  }

  const targetPath = getDatabaseFilePath();
  if (databaseHasAppSchema(targetPath)) {
    return;
  }

  const seedPath = getDatabaseSeedPath();
  if (!fs.existsSync(seedPath)) {
    throw new Error(
      "Falta vercel-build.db en el deploy. Configurá Build Command: npm run vercel-build.",
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
