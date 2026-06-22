-- CreateTable
CREATE TABLE "ContextEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurredAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "content" TEXT NOT NULL,
    "structuredData" JSONB NOT NULL,
    "pillar" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "correlationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContextEventLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT,
    "linkRole" TEXT NOT NULL DEFAULT 'primary',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContextEventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ContextEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pillar" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "summary" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "sourceEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthRecord_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "ContextEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContextEvent_source_sourceRef_idx" ON "ContextEvent"("source", "sourceRef");
CREATE INDEX "ContextEvent_status_occurredAt_idx" ON "ContextEvent"("status", "occurredAt");
CREATE INDEX "ContextEvent_pillar_occurredAt_idx" ON "ContextEvent"("pillar", "occurredAt");
CREATE INDEX "ContextEvent_correlationId_idx" ON "ContextEvent"("correlationId");
CREATE INDEX "ContextEventLink_eventId_idx" ON "ContextEventLink"("eventId");
CREATE INDEX "ContextEventLink_entityType_entityId_idx" ON "ContextEventLink"("entityType", "entityId");
CREATE INDEX "HealthRecord_pillar_occurredAt_idx" ON "HealthRecord"("pillar", "occurredAt");
CREATE INDEX "HealthRecord_sourceEventId_idx" ON "HealthRecord"("sourceEventId");
