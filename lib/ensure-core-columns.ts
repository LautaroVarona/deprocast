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

    if (!tableExists(db, "PersonToPerson")) {
      db.exec(`
        CREATE TABLE "PersonToPerson" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "personAId" TEXT NOT NULL,
          "personBId" TEXT NOT NULL,
          "relationContext" TEXT NOT NULL,
          "relationType" TEXT,
          "strength" INTEGER,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "PersonToPerson_personAId_fkey" FOREIGN KEY ("personAId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "PersonToPerson_personBId_fkey" FOREIGN KEY ("personBId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS "PersonToPerson_personAId_personBId_key" ON "PersonToPerson"("personAId", "personBId");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "PersonToPerson_personAId_idx" ON "PersonToPerson"("personAId");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "PersonToPerson_personBId_idx" ON "PersonToPerson"("personBId");`,
      );
    }

    if (!tableExists(db, "PersonToProject")) {
      db.exec(`
        CREATE TABLE "PersonToProject" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "personId" TEXT NOT NULL,
          "projectId" TEXT NOT NULL,
          "relationContext" TEXT NOT NULL,
          "relationType" TEXT,
          "strength" INTEGER,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "PersonToProject_personId_fkey" FOREIGN KEY ("personId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "PersonToProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS "PersonToProject_personId_projectId_key" ON "PersonToProject"("personId", "projectId");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "PersonToProject_personId_idx" ON "PersonToProject"("personId");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "PersonToProject_projectId_idx" ON "PersonToProject"("projectId");`,
      );
    }

    if (!tableExists(db, "EntityCandidate")) {
      db.exec(`
        CREATE TABLE "EntityCandidate" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "contextSnippet" TEXT NOT NULL,
          "sourceId" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "resolvedNodeId" TEXT,
          "metadata" JSONB NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "EntityCandidate_status_createdAt_idx" ON "EntityCandidate"("status", "createdAt");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "EntityCandidate_type_status_idx" ON "EntityCandidate"("type", "status");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "EntityCandidate_sourceId_idx" ON "EntityCandidate"("sourceId");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "EntityCandidate_name_idx" ON "EntityCandidate"("name");`,
      );
    } else {
      if (!columnExists(db, "EntityCandidate", "contextSnippet")) {
        db.exec(
          `ALTER TABLE "EntityCandidate" ADD COLUMN "contextSnippet" TEXT NOT NULL DEFAULT '';`,
        );
      }
      if (!columnExists(db, "EntityCandidate", "sourceId")) {
        db.exec(`ALTER TABLE "EntityCandidate" ADD COLUMN "sourceId" TEXT;`);
      }
      if (!columnExists(db, "EntityCandidate", "resolvedNodeId")) {
        db.exec(
          `ALTER TABLE "EntityCandidate" ADD COLUMN "resolvedNodeId" TEXT;`,
        );
      }
    }

    // Migración one-shot desde CandidateEntity legacy.
    if (tableExists(db, "CandidateEntity") && tableExists(db, "EntityCandidate")) {
      db.exec(`
        INSERT OR IGNORE INTO "EntityCandidate" (
          "id", "name", "type", "contextSnippet", "sourceId", "status",
          "resolvedNodeId", "metadata", "createdAt", "updatedAt"
        )
        SELECT
          "id",
          "name",
          CASE
            WHEN UPPER("type") IN ('PERSON', 'PERSONA') THEN 'PERSON'
            WHEN UPPER("type") IN ('PROJECT', 'PROYECTO') THEN 'PROJECT'
            ELSE 'PERSON'
          END,
          COALESCE(NULLIF(TRIM("sourceContext"), ''), 'Extracción sin fragmento de contexto.'),
          NULL,
          CASE
            WHEN UPPER("status") IN ('PENDING', 'APPROVED', 'REJECTED', 'MERGED')
              THEN UPPER("status")
            ELSE 'PENDING'
          END,
          NULL,
          COALESCE("metadata", '{}'),
          "createdAt",
          "updatedAt"
        FROM "CandidateEntity";
      `);
    }
  } finally {
    db.close();
  }
}

export async function ensureCoreColumnPatchesRuntime(): Promise<void> {
  ensureCoreColumnPatches();
}
