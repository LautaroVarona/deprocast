-- CreateTable
CREATE TABLE "ProjectProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "originContext" TEXT NOT NULL,
    "originType" TEXT NOT NULL,
    "originRef" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "suggestedCampoSlug" TEXT,
    "suggestedTipo" TEXT,
    "mvp" TEXT,
    "firstStep" TEXT,
    "priorityReason" TEXT,
    "sourcePayload" JSONB,
    "activatedProjectId" TEXT,
    "activatedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ProjectProposal_status_idx" ON "ProjectProposal"("status");

-- CreateIndex
CREATE INDEX "ProjectProposal_createdAt_idx" ON "ProjectProposal"("createdAt");
