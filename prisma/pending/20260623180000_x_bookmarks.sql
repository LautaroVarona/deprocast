-- X-Bookmark-Calibrator: marcadores importados, calibrados y enriquecidos
-- Aplicado vía `prisma db push` sobre la base de desarrollo existente.

CREATE TABLE "XBookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "author" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mediaUrls" JSONB NOT NULL DEFAULT '[]',
    "tweetUrl" TEXT,
    "bookmarkedAt" TEXT,
    "weight" INTEGER,
    "calibratedAt" DATETIME,
    "titleEs" TEXT,
    "metaTags" JSONB,
    "linkedProjects" JSONB,
    "enrichedAt" DATETIME,
    "importBatchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "XBookmark_status_idx" ON "XBookmark"("status");
CREATE INDEX "XBookmark_weight_idx" ON "XBookmark"("weight");
CREATE INDEX "XBookmark_importBatchId_idx" ON "XBookmark"("importBatchId");
CREATE INDEX "XBookmark_externalId_idx" ON "XBookmark"("externalId");
