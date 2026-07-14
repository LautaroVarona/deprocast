-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurredAt" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "agentId" TEXT,
    "agentName" TEXT,
    "modelUsed" TEXT,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_sourceType_sourceRef_action_key" ON "ActivityLog"("sourceType", "sourceRef", "action");

-- CreateIndex
CREATE INDEX "ActivityLog_occurredAt_idx" ON "ActivityLog"("occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_category_occurredAt_idx" ON "ActivityLog"("category", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_agentId_occurredAt_idx" ON "ActivityLog"("agentId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_correlationId_idx" ON "ActivityLog"("correlationId");
