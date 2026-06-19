import { execSync } from "node:child_process";
import fs from "node:fs";

import {
  ensureRuntimeDirs,
  getAppRoot,
  getDatabaseFilePath,
  getDatabaseSeedPath,
  isVercelRuntime,
} from "@/lib/runtime-paths";

let setupPromise: Promise<void> | null = null;

function databaseHasSchema(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const stat = fs.statSync(dbPath);
    if (stat.size < 64) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3") as typeof import("better-sqlite3");
    const db = new Database(dbPath, { readonly: true });

    try {
      const row = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='AudioAsset'",
        )
        .get() as { name?: string } | undefined;

      return Boolean(row?.name);
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

function bootstrapDatabaseWithMigrations(targetPath: string): void {
  execSync("npx prisma migrate deploy", {
    cwd: getAppRoot(),
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: `file:${targetPath}`,
    },
  });

  if (!databaseHasSchema(targetPath)) {
    throw new Error(
      "No se pudo inicializar SQLite en runtime: faltan tablas tras migrate deploy.",
    );
  }
}

async function ensureDatabase(): Promise<void> {
  if (!isVercelRuntime()) {
    return;
  }

  const targetPath = getDatabaseFilePath();
  if (databaseHasSchema(targetPath)) {
    return;
  }

  if (fs.existsSync(targetPath)) {
    await fs.promises.unlink(targetPath).catch(() => undefined);
  }

  const seedPath = getDatabaseSeedPath();
  if (fs.existsSync(seedPath)) {
    await fs.promises.copyFile(seedPath, targetPath);

    if (databaseHasSchema(targetPath)) {
      return;
    }

    await fs.promises.unlink(targetPath).catch(() => undefined);
    console.warn(
      "prisma/vercel-build.db no tiene el esquema esperado; se intentará migrate deploy en runtime.",
    );
  } else {
    console.warn(
      "No se encontró prisma/vercel-build.db; se intentará migrate deploy en runtime.",
    );
  }

  bootstrapDatabaseWithMigrations(targetPath);
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
