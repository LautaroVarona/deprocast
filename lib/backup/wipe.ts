import fs from "node:fs";
import path from "node:path";

import { disconnectPrismaClient } from "@/lib/prisma";
import { processingQueue } from "@/lib/processing-queue";
import {
  getDataRoot,
  getDatabaseFilePath,
  getUploadDir,
} from "@/lib/runtime-paths";

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
      await fs.promises.unlink(filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" || attempt === attempts - 1) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 100 * (attempt + 1));
      });
    }
  }
}

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
