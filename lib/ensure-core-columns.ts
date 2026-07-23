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

    if (!tableExists(db, "Yo")) {
      db.exec(`
        CREATE TABLE "Yo" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "operatorName" TEXT,
          "exocortexName" TEXT,
          "exocortexNamedBy" TEXT,
          "operationalStatus" TEXT NOT NULL DEFAULT 'STANDBY',
          "energyLevel" INTEGER NOT NULL DEFAULT 5,
          "calibration" JSONB NOT NULL DEFAULT '{}',
          "genesisCompletedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      db.exec(`
        INSERT INTO "Yo" ("id", "operationalStatus", "energyLevel", "calibration", "createdAt", "updatedAt")
        VALUES ('core', 'STANDBY', 5, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `);
    }

    if (!tableExists(db, "YoConduitMessage")) {
      db.exec(`
        CREATE TABLE "YoConduitMessage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "yoId" TEXT NOT NULL DEFAULT 'core',
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "YoConduitMessage_yoId_fkey" FOREIGN KEY ("yoId") REFERENCES "Yo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "YoConduitMessage_yoId_createdAt_idx" ON "YoConduitMessage"("yoId", "createdAt");`,
      );
    }

    if (tableExists(db, "OperatorProfile") && tableExists(db, "Yo")) {
      const hasCore = db
        .prepare(`SELECT operatorName FROM "Yo" WHERE id = 'core'`)
        .get() as { operatorName: string | null } | undefined;
      if (hasCore && !hasCore.operatorName) {
        const legacy = db
          .prepare(
            `SELECT displayName, operationalStatus, energyLevel, calibration FROM "OperatorProfile" WHERE id = 'operator'`,
          )
          .get() as
          | {
              displayName: string;
              operationalStatus: string;
              energyLevel: number;
              calibration: string;
            }
          | undefined;
        if (
          legacy &&
          legacy.displayName?.trim() &&
          legacy.displayName.trim().toLowerCase() !== "lautaro"
        ) {
          db.prepare(
            `UPDATE "Yo" SET operatorName = ?, operationalStatus = ?, energyLevel = ?, calibration = ?, genesisCompletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = 'core'`,
          ).run(
            legacy.displayName.trim(),
            legacy.operationalStatus || "OPERATIVO",
            legacy.energyLevel ?? 5,
            legacy.calibration || "{}",
          );
        }
      }
    }
  } finally {
    db.close();
  }
}

export async function ensureCoreColumnPatchesRuntime(): Promise<void> {
  ensureCoreColumnPatches();
}
