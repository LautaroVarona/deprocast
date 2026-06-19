import fs from "node:fs";

import {
  ensureRuntimeDirs,
  getDatabaseFilePath,
  getDatabaseSeedPath,
  isVercelRuntime,
} from "@/lib/runtime-paths";

let setupPromise: Promise<void> | null = null;

async function ensureDatabase(): Promise<void> {
  if (!isVercelRuntime()) {
    return;
  }

  const targetPath = getDatabaseFilePath();
  if (fs.existsSync(targetPath)) {
    return;
  }

  const seedPath = getDatabaseSeedPath();
  if (fs.existsSync(seedPath)) {
    await fs.promises.copyFile(seedPath, targetPath);
    return;
  }

  console.warn(
    "No se encontró prisma/vercel-build.db; la base en /tmp arrancará vacía.",
  );
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
