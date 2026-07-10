-- Tablas que existían solo vía db push local: PendingTask, Ludus, MemoryEmbedding, ProjectIncubationSession

CREATE TABLE "ProjectIncubationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'active',
    "messages" JSONB NOT NULL,
    "extractionState" JSONB NOT NULL,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ProjectIncubationSession_status_idx" ON "ProjectIncubationSession"("status");
CREATE INDEX "ProjectIncubationSession_updatedAt_idx" ON "ProjectIncubationSession"("updatedAt");

CREATE TABLE "PendingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "targetDay" DATETIME NOT NULL,
    "weight" INTEGER,
    "bloque" TEXT,
    "projectId" TEXT,
    "reviewId" TEXT,
    "universeSlug" TEXT,
    "listadorConfidence" REAL,
    "recognizedAt" DATETIME,
    "calibratedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "PendingTask_status_targetDay_idx" ON "PendingTask"("status", "targetDay");
CREATE INDEX "PendingTask_source_sourceRef_idx" ON "PendingTask"("source", "sourceRef");
CREATE INDEX "PendingTask_weight_targetDay_idx" ON "PendingTask"("weight", "targetDay");
CREATE INDEX "PendingTask_universeSlug_status_targetDay_idx" ON "PendingTask"("universeSlug", "status", "targetDay");

CREATE TABLE "LudusState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signalPoints" INTEGER NOT NULL DEFAULT 0,
    "unlockedStatues" JSONB NOT NULL DEFAULT '[]',
    "assaultStreakToday" INTEGER NOT NULL DEFAULT 0,
    "lastAssaultDate" TEXT,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LudusProjectRegistry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastCalibratedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "LudusProjectRegistry_projectId_key" ON "LudusProjectRegistry"("projectId");
CREATE INDEX "LudusProjectRegistry_status_idx" ON "LudusProjectRegistry"("status");

CREATE TABLE "LudusMicrotask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "estimatedMin" INTEGER NOT NULL DEFAULT 15,
    "baseWeight" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "forgedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "LudusMicrotask_projectId_idx" ON "LudusMicrotask"("projectId");
CREATE INDEX "LudusMicrotask_status_idx" ON "LudusMicrotask"("status");

CREATE TABLE "LudusAssaultSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "microtaskId" TEXT,
    "pendingTaskId" TEXT,
    "title" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 25,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "tabSurvived" BOOLEAN NOT NULL DEFAULT false,
    "signalPoints" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LudusAssaultSession_microtaskId_fkey" FOREIGN KEY ("microtaskId") REFERENCES "LudusMicrotask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LudusAssaultSession_pendingTaskId_fkey" FOREIGN KEY ("pendingTaskId") REFERENCES "PendingTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "LudusAssaultSession_startedAt_idx" ON "LudusAssaultSession"("startedAt");
CREATE INDEX "LudusAssaultSession_microtaskId_idx" ON "LudusAssaultSession"("microtaskId");
CREATE INDEX "LudusAssaultSession_pendingTaskId_idx" ON "LudusAssaultSession"("pendingTaskId");

CREATE TABLE "MemoryEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedModel" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "MemoryEmbedding_sourceType_sourceId_chunkIndex_key" ON "MemoryEmbedding"("sourceType", "sourceId", "chunkIndex");
CREATE INDEX "MemoryEmbedding_sourceType_sourceId_idx" ON "MemoryEmbedding"("sourceType", "sourceId");
CREATE INDEX "MemoryEmbedding_contentHash_idx" ON "MemoryEmbedding"("contentHash");
