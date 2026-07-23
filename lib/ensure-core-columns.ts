import fs from "node:fs";

import Database from "better-sqlite3";

import { getDatabaseFilePath } from "@/lib/runtime-paths";

function columnExists(
  db: Database.Database,
  tableName: string,
  columnName: string,
): boolean {
  const rows = db.prepare(`PRAGMA table_info("${tableName}")`).all() as Array<{
    name: string;
  }>;
  return rows.some((row) => row.name === columnName);
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    )
    .get(tableName) as { ok: number } | undefined;
  return Boolean(row);
}

/**
 * Parches de columnas que están en schema.prisma pero faltaron en migraciones
 * antiguas — evita fallos Prisma en seed Vercel /tmp y DBs locales desfasadas.
 */
export function ensureCoreColumnPatches(): void {
  const dbPath = getDatabaseFilePath();
  if (!fs.existsSync(dbPath)) {
    return;
  }

  const db = new Database(dbPath);
  try {
    if (tableExists(db, "NotebookPage")) {
      if (!columnExists(db, "NotebookPage", "pageMetatags")) {
        db.exec(`ALTER TABLE "NotebookPage" ADD COLUMN "pageMetatags" JSONB;`);
      }
      if (!columnExists(db, "NotebookPage", "enrichments")) {
        db.exec(`ALTER TABLE "NotebookPage" ADD COLUMN "enrichments" JSONB;`);
      }
    }

    if (
      tableExists(db, "CastleCard") &&
      !columnExists(db, "CastleCard", "metadata")
    ) {
      db.exec(
        `ALTER TABLE "CastleCard" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';`,
      );
    }

    if (
      tableExists(db, "PurifierReview") &&
      !columnExists(db, "PurifierReview", "pipelineStatus")
    ) {
      db.exec(
        `ALTER TABLE "PurifierReview" ADD COLUMN "pipelineStatus" TEXT NOT NULL DEFAULT 'pendiente_validacion';`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "PurifierReview_pipelineStatus_processedAt_idx" ON "PurifierReview"("pipelineStatus", "processedAt");`,
      );
    }
  } finally {
    db.close();
  }
}

export async function ensureCoreColumnPatchesRuntime(): Promise<void> {
  ensureCoreColumnPatches();
}
