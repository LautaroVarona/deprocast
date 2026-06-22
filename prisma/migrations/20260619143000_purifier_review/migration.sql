-- Cola HITL del purificador en SQLite (compartida entre invocaciones en la misma instancia).

CREATE TABLE "PurifierReview" (
    "reviewId" TEXT NOT NULL PRIMARY KEY,
    "particula" TEXT NOT NULL,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PurifierReview_processedAt_idx" ON "PurifierReview"("processedAt");
CREATE INDEX "PurifierReview_assetId_idx" ON "PurifierReview"("assetId");
