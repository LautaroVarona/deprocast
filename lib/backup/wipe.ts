import fs from "node:fs";
import path from "node:path";

import {
  assertLocalBackupAllowed,
  assertNoActiveProcessing,
} from "@/lib/backup/guards";
import { disconnectPrismaClient, getPrismaClient, resetPrismaClient } from "@/lib/prisma";
import { processingQueue } from "@/lib/processing-queue";
import {
  getDataRoot,
  getDatabaseFilePath,
  getUploadDir,
} from "@/lib/runtime-paths";
import {
  databaseHasAppSchema,
  ensureRuntimeReady,
  resetRuntimeSetupCache,
} from "@/lib/runtime-setup";

async function removeDirectoryContents(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await fs.promises.rm(entryPath, { recursive: true, force: true });
        return;
      }

      await fs.promises.unlink(entryPath);
    }),
  );
}

async function unlinkWithRetry(filePath: string, attempts = 5): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }
      await fs.promises.unlink(filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return;
      }
      if (code !== "EBUSY" || attempt === attempts - 1) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 100 * (attempt + 1));
      });
    }
  }
}

async function removeSqliteDatabaseFiles(dbPath: string): Promise<void> {
  await unlinkWithRetry(dbPath);
  await unlinkWithRetry(`${dbPath}-journal`);
  await unlinkWithRetry(`${dbPath}-wal`);
  await unlinkWithRetry(`${dbPath}-shm`);
}

/**
 * Limpia cola, desconecta Prisma y vacía data/ + uploads/.
 * No elimina el archivo SQLite (el restore full lo sobrescribe).
 */
export async function wipeCurrentState(): Promise<void> {
  await processingQueue.clearQueue();
  await disconnectPrismaClient();

  const dbPath = getDatabaseFilePath();
  const journalPath = `${dbPath}-journal`;

  if (fs.existsSync(journalPath)) {
    await unlinkWithRetry(journalPath);
  }

  // La base de datos se sobrescribe en restore; no la borramos aquí
  // para evitar EBUSY en Windows si el archivo aún está siendo liberado.

  await removeDirectoryContents(getDataRoot());
  await removeDirectoryContents(getUploadDir());
}

export type FactoryResetResult = {
  success: true;
  resetAt: string;
};

/**
 * Reinicio de fábrica: borra SQLite + data/ + uploads/, recrea esquema vacío
 * y rehidrata solo el mínimo runtime (Babel raíz, etc.).
 * Irreversible.
 */
export async function factoryResetSystem(): Promise<FactoryResetResult> {
  assertLocalBackupAllowed();
  await assertNoActiveProcessing();

  await wipeCurrentState();

  const dbPath = getDatabaseFilePath();
  await fs.promises.mkdir(path.dirname(dbPath), { recursive: true });
  await removeSqliteDatabaseFiles(dbPath);

  resetPrismaClient();
  resetRuntimeSetupCache();

  await ensureRuntimeReady();
  await disconnectPrismaClient();
  getPrismaClient();

  const { ensureYoShell } = await import("@/lib/yo/store");
  await ensureYoShell();

  if (!databaseHasAppSchema(getDatabaseFilePath())) {
    throw new Error(
      "El reinicio falló: la base de datos vacía no se pudo recrear correctamente.",
    );
  }

  return {
    success: true,
    resetAt: new Date().toISOString(),
  };
}
