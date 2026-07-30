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

    if (
      tableExists(db, "KgEdge") &&
      !columnExists(db, "KgEdge", "reconocido")
    ) {
      db.exec(
        `ALTER TABLE "KgEdge" ADD COLUMN "reconocido" BOOLEAN NOT NULL DEFAULT false;`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "KgEdge_reconocido_idx" ON "KgEdge"("reconocido");`,
      );
    }

    // Escala Hermética: backfill de pesos nulos → 6 (neutro) antes de NOT NULL.
    if (tableExists(db, "KgEdge")) {
      db.exec(`UPDATE "KgEdge" SET "weight" = 6 WHERE "weight" IS NULL;`);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "KgEdge_weight_idx" ON "KgEdge"("weight");`,
      );
    }

    if (tableExists(db, "Quantomo")) {
      if (!columnExists(db, "Quantomo", "embedding")) {
        db.exec(`ALTER TABLE "Quantomo" ADD COLUMN "embedding" TEXT;`);
      }
      if (!columnExists(db, "Quantomo", "embedModel")) {
        db.exec(`ALTER TABLE "Quantomo" ADD COLUMN "embedModel" TEXT;`);
      }
      if (!columnExists(db, "Quantomo", "dimensions")) {
        db.exec(`ALTER TABLE "Quantomo" ADD COLUMN "dimensions" INTEGER;`);
      }
      if (!columnExists(db, "Quantomo", "kgNodeId")) {
        db.exec(`ALTER TABLE "Quantomo" ADD COLUMN "kgNodeId" TEXT;`);
        db.exec(
          `CREATE UNIQUE INDEX IF NOT EXISTS "Quantomo_kgNodeId_key" ON "Quantomo"("kgNodeId");`,
        );
      }
    }

    if (
      tableExists(db, "KgNode") &&
      !columnExists(db, "KgNode", "reconocido")
    ) {
      db.exec(
        `ALTER TABLE "KgNode" ADD COLUMN "reconocido" BOOLEAN NOT NULL DEFAULT false;`,
      );
      // Backfill: grafo existente se trata como validado (misma lógica que la migración).
      db.exec(`UPDATE "KgNode" SET "reconocido" = true;`);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "KgNode_reconocido_idx" ON "KgNode"("reconocido");`,
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
            `UPDATE "Yo" SET operatorName = ?, operationalStatus = ?, energyLevel = ?, calibration = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 'core'`,
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

    if (tableExists(db, "Yo")) {
      if (!columnExists(db, "Yo", "mago12")) {
        db.exec(
          `ALTER TABLE "Yo" ADD COLUMN "mago12" INTEGER NOT NULL DEFAULT 1;`,
        );
      }
      if (!columnExists(db, "Yo", "mago3")) {
        db.exec(
          `ALTER TABLE "Yo" ADD COLUMN "mago3" TEXT NOT NULL DEFAULT 'cuerpo';`,
        );
      }
    }

    if (!tableExists(db, "AmazonAResource")) {
      db.exec(`
        CREATE TABLE "AmazonAResource" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT NOT NULL DEFAULT '',
          "powerIds" JSONB NOT NULL,
          "kgNodeId" TEXT,
          "projectId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS "AmazonAResource_kgNodeId_key" ON "AmazonAResource"("kgNodeId");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "AmazonAResource_projectId_idx" ON "AmazonAResource"("projectId");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "AmazonAResource_name_idx" ON "AmazonAResource"("name");`,
      );
    }

    // Atanor Temporal (Jornada): sesión diaria + hilos.
    if (!tableExists(db, "DailySession")) {
      db.exec(`
        CREATE TABLE "DailySession" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "date" TEXT NOT NULL,
          "isClosed" BOOLEAN NOT NULL DEFAULT false,
          "summaryMarkdown" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS "DailySession_date_key" ON "DailySession"("date");`,
      );
    }

    if (!tableExists(db, "SessionThread")) {
      db.exec(`
        CREATE TABLE "SessionThread" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "dailySessionId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "topic" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "SessionThread_dailySessionId_fkey" FOREIGN KEY ("dailySessionId") REFERENCES "DailySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "SessionThread_dailySessionId_idx" ON "SessionThread"("dailySessionId");`,
      );
    }

    if (!tableExists(db, "ThreadContext")) {
      db.exec(`
        CREATE TABLE "ThreadContext" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "threadId" TEXT NOT NULL,
          "tagType" TEXT NOT NULL,
          "tagId" TEXT NOT NULL,
          "tagLabel" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ThreadContext_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SessionThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "ThreadContext_threadId_idx" ON "ThreadContext"("threadId");`,
      );
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ThreadContext_threadId_tagType_tagId_key" ON "ThreadContext"("threadId", "tagType", "tagId");`,
      );
    }

    if (!tableExists(db, "ThreadMessage")) {
      db.exec(`
        CREATE TABLE "ThreadMessage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "threadId" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SessionThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "ThreadMessage_threadId_createdAt_idx" ON "ThreadMessage"("threadId", "createdAt");`,
      );
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

    if (!tableExists(db, "AtanorProject")) {
      db.exec(`
        CREATE TABLE "AtanorProject" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "campoSlug" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "payload" JSONB NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      db.exec(
        `CREATE INDEX IF NOT EXISTS "AtanorProject_campoSlug_idx" ON "AtanorProject"("campoSlug");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "AtanorProject_title_idx" ON "AtanorProject"("title");`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS "AtanorProject_updatedAt_idx" ON "AtanorProject"("updatedAt");`,
      );
    }

    if (tableExists(db, "AudioAsset")) {
      if (!columnExists(db, "AudioAsset", "pipelineStation")) {
        db.exec(
          `ALTER TABLE "AudioAsset" ADD COLUMN "pipelineStation" TEXT NOT NULL DEFAULT 'QUEUED';`,
        );
        db.exec(
          `CREATE INDEX IF NOT EXISTS "AudioAsset_pipelineStation_idx" ON "AudioAsset"("pipelineStation");`,
        );
      }
      if (!columnExists(db, "AudioAsset", "pipelineError")) {
        db.exec(`ALTER TABLE "AudioAsset" ADD COLUMN "pipelineError" TEXT;`);
      }
      if (!columnExists(db, "AudioAsset", "originAttributionId")) {
        db.exec(
          `ALTER TABLE "AudioAsset" ADD COLUMN "originAttributionId" TEXT;`,
        );
      }
    }

    if (
      tableExists(db, "OriginAttribution") &&
      !columnExists(db, "OriginAttribution", "ambientContext")
    ) {
      db.exec(
        `ALTER TABLE "OriginAttribution" ADD COLUMN "ambientContext" TEXT;`,
      );
    }

    // KG + molecular tables (seed vercel-build.db a menudo viene sin ellas → P2021).
    if (!tableExists(db, "KgNode")) {
      db.exec(`
        CREATE TABLE "KgNode" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "primaryName" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "aliases" JSONB NOT NULL,
          "metadata" JSONB NOT NULL,
          "confidence" REAL NOT NULL DEFAULT 0.6,
          "reconocido" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
        CREATE UNIQUE INDEX "KgNode_primaryName_type_key" ON "KgNode"("primaryName", "type");
        CREATE INDEX "KgNode_type_idx" ON "KgNode"("type");
        CREATE INDEX "KgNode_primaryName_idx" ON "KgNode"("primaryName");
        CREATE INDEX "KgNode_reconocido_idx" ON "KgNode"("reconocido");
      `);
    }

    if (!tableExists(db, "KgEdge")) {
      db.exec(`
        CREATE TABLE "KgEdge" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sourceNodeId" TEXT NOT NULL,
          "targetNodeId" TEXT NOT NULL,
          "relationType" TEXT NOT NULL,
          "context" TEXT NOT NULL,
          "weight" INTEGER,
          "metadata" JSONB NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "KgEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "KgEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX "KgEdge_sourceNodeId_targetNodeId_relationType_key" ON "KgEdge"("sourceNodeId", "targetNodeId", "relationType");
        CREATE INDEX "KgEdge_sourceNodeId_idx" ON "KgEdge"("sourceNodeId");
        CREATE INDEX "KgEdge_targetNodeId_idx" ON "KgEdge"("targetNodeId");
        CREATE INDEX "KgEdge_relationType_idx" ON "KgEdge"("relationType");
      `);
    }

    if (!tableExists(db, "KgMention")) {
      db.exec(`
        CREATE TABLE "KgMention" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "nodeId" TEXT NOT NULL,
          "sourceType" TEXT NOT NULL,
          "sourceId" TEXT NOT NULL,
          "fragment" TEXT NOT NULL,
          "offsetStart" INTEGER,
          "offsetEnd" INTEGER,
          "metadata" JSONB NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "KgMention_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE INDEX "KgMention_sourceType_sourceId_idx" ON "KgMention"("sourceType", "sourceId");
        CREATE INDEX "KgMention_nodeId_idx" ON "KgMention"("nodeId");
      `);
    }

    if (!tableExists(db, "OriginAttribution")) {
      db.exec(`
        CREATE TABLE "OriginAttribution" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "channel" TEXT NOT NULL,
          "timestampExacto" DATETIME NOT NULL,
          "diaSemana" TEXT NOT NULL,
          "locationName" TEXT,
          "ambientContext" TEXT,
          "actors" JSONB NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX "OriginAttribution_channel_idx" ON "OriginAttribution"("channel");
        CREATE INDEX "OriginAttribution_timestampExacto_idx" ON "OriginAttribution"("timestampExacto");
      `);
    }

    if (!tableExists(db, "Quantomo")) {
      db.exec(`
        CREATE TABLE "Quantomo" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "titleSugerido" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "tagsSemanticos" JSONB NOT NULL DEFAULT '[]',
          "universo" TEXT NOT NULL,
          "embedding" TEXT,
          "embedModel" TEXT,
          "dimensions" INTEGER,
          "kgNodeId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "originAttributionId" TEXT NOT NULL,
          CONSTRAINT "Quantomo_originAttributionId_fkey" FOREIGN KEY ("originAttributionId") REFERENCES "OriginAttribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "Quantomo_kgNodeId_fkey" FOREIGN KEY ("kgNodeId") REFERENCES "KgNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX "Quantomo_kgNodeId_key" ON "Quantomo"("kgNodeId");
        CREATE INDEX "Quantomo_universo_idx" ON "Quantomo"("universo");
        CREATE INDEX "Quantomo_originAttributionId_idx" ON "Quantomo"("originAttributionId");
        CREATE INDEX "Quantomo_createdAt_idx" ON "Quantomo"("createdAt");
      `);
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
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX "EntityCandidate_status_createdAt_idx" ON "EntityCandidate"("status", "createdAt");
        CREATE INDEX "EntityCandidate_type_status_idx" ON "EntityCandidate"("type", "status");
        CREATE INDEX "EntityCandidate_sourceId_idx" ON "EntityCandidate"("sourceId");
        CREATE INDEX "EntityCandidate_name_idx" ON "EntityCandidate"("name");
      `);
    }

    if (!tableExists(db, "AudioUploadSession")) {
      db.exec(`
        CREATE TABLE "AudioUploadSession" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "assetId" TEXT NOT NULL,
          "filename" TEXT NOT NULL,
          "extension" TEXT NOT NULL,
          "totalChunks" INTEGER NOT NULL,
          "ambientContext" TEXT NOT NULL DEFAULT 'caminata',
          "receivedJson" TEXT NOT NULL DEFAULT '[]',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX "AudioUploadSession_assetId_key" ON "AudioUploadSession"("assetId");
      `);
    }

    if (!tableExists(db, "AudioUploadChunk")) {
      db.exec(`
        CREATE TABLE "AudioUploadChunk" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "uploadId" TEXT NOT NULL,
          "chunkIndex" INTEGER NOT NULL,
          "data" BLOB NOT NULL,
          CONSTRAINT "AudioUploadChunk_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "AudioUploadSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX "AudioUploadChunk_uploadId_chunkIndex_key" ON "AudioUploadChunk"("uploadId", "chunkIndex");
        CREATE INDEX "AudioUploadChunk_uploadId_idx" ON "AudioUploadChunk"("uploadId");
      `);
    }
  } finally {
    db.close();
  }
}

export async function ensureCoreColumnPatchesRuntime(): Promise<void> {
  ensureCoreColumnPatches();
}
