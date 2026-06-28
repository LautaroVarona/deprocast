-- CreateTable
CREATE TABLE "EncyclopediaEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "explorableTerms" JSONB NOT NULL,
    "parentEntryId" TEXT,
    "triggerTerm" TEXT,
    "model" TEXT,
    "validatedCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "kgNodeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EncyclopediaEntry_parentEntryId_fkey" FOREIGN KEY ("parentEntryId") REFERENCES "EncyclopediaEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EncyclopediaEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromEntryId" TEXT NOT NULL,
    "toEntryId" TEXT NOT NULL,
    "triggerTerm" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncyclopediaEdge_fromEntryId_fkey" FOREIGN KEY ("fromEntryId") REFERENCES "EncyclopediaEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EncyclopediaEdge_toEntryId_fkey" FOREIGN KEY ("toEntryId") REFERENCES "EncyclopediaEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EncyclopediaReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "comment" TEXT,
    "bodySnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncyclopediaReport_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "EncyclopediaEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EncyclopediaEntry_slug_key" ON "EncyclopediaEntry"("slug");

-- CreateIndex
CREATE INDEX "EncyclopediaEntry_parentEntryId_idx" ON "EncyclopediaEntry"("parentEntryId");

-- CreateIndex
CREATE INDEX "EncyclopediaEntry_slug_idx" ON "EncyclopediaEntry"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EncyclopediaEdge_fromEntryId_toEntryId_triggerTerm_key" ON "EncyclopediaEdge"("fromEntryId", "toEntryId", "triggerTerm");

-- CreateIndex
CREATE INDEX "EncyclopediaEdge_fromEntryId_idx" ON "EncyclopediaEdge"("fromEntryId");

-- CreateIndex
CREATE INDEX "EncyclopediaEdge_toEntryId_idx" ON "EncyclopediaEdge"("toEntryId");

-- CreateIndex
CREATE INDEX "EncyclopediaReport_entryId_idx" ON "EncyclopediaReport"("entryId");

-- CreateIndex
CREATE INDEX "EncyclopediaReport_type_idx" ON "EncyclopediaReport"("type");
