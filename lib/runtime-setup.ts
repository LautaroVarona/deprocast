import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import {
  ensureRuntimeDirs,
  getAppRoot,
  getDatabaseFilePath,
  getDatabaseSeedPath,
  getDatabaseUrl,
  isVercelRuntime,
} from "@/lib/runtime-paths";

let setupPromise: Promise<void> | null = null;

const SQLITE_MAGIC = "SQLite format 3";
const SCHEMA_MARKER = "AudioAsset";
const PARTIAL_META_MARKER = "_deprocast_export_meta";
const LOCAL_PUSH_TABLES = ["PendingTask", "LudusState", "ActivityLog"] as const;

function sqliteTableExists(dbPath: string, tableName: string): boolean {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get(tableName) as { ok: number } | undefined;
    return Boolean(row);
  } finally {
    db.close();
  }
}

function missingLocalPushTables(dbPath: string): string[] {
  return LOCAL_PUSH_TABLES.filter((tableName) => !sqliteTableExists(dbPath, tableName));
}

function runPrismaDbPush(): void {
  const prismaCli = path.join(getAppRoot(), "node_modules", "prisma", "build", "index.js");

  if (!fs.existsSync(prismaCli)) {
    throw new Error(
      "Faltan tablas locales (PendingTask, Ludus…). Ejecutá `npm run db:meta` en la raíz del proyecto.",
    );
  }

  execFileSync(
    process.execPath,
    [prismaCli, "db", "push", "--url", getDatabaseUrl()],
    {
      cwd: getAppRoot(),
      env: {
        ...process.env,
        DATABASE_URL: getDatabaseUrl(),
      },
      stdio: "pipe",
    },
  );
}

async function ensureLocalDatabaseSchema(): Promise<void> {
  if (isVercelRuntime()) {
    return;
  }

  const dbPath = getDatabaseFilePath();
  const missingTables = missingLocalPushTables(dbPath);

  if (missingTables.length === 0) {
    return;
  }

  console.warn(
    `[deprocast] SQLite sin tablas ${missingTables.join(", ")}. Aplicando prisma db push…`,
  );

  runPrismaDbPush();

  const stillMissing = missingLocalPushTables(dbPath);
  if (stillMissing.length > 0) {
    throw new Error(
      `La base local sigue sin tablas (${stillMissing.join(", ")}). Ejecutá manualmente: npm run db:meta`,
    );
  }

  const { resetPrismaClient } = await import("@/lib/prisma");
  resetPrismaClient();
}

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

    if (header !== SQLITE_MAGIC) {
      return false;
    }

    return (
      file.includes(SCHEMA_MARKER) ||
      file.includes(PARTIAL_META_MARKER)
    );
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
      await ensureLocalDatabaseSchema();
      const { ensureMagoRuntime } = await import("@/lib/mago/ensure-schema");
      await ensureMagoRuntime();
      const { ensureRootUniverse } = await import("@/lib/babel/universe-store");
      await ensureRootUniverse();
    })().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
}
