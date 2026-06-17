-- Confianza por nodo/edge/mencion + tabla de fuentes para ingesta incremental.
-- Aplicado vía `prisma db push` sobre la base de desarrollo existente.

ALTER TABLE "KgNode" ADD COLUMN "confidence" REAL NOT NULL DEFAULT 0.6;
ALTER TABLE "KgEdge" ADD COLUMN "confidence" REAL NOT NULL DEFAULT 0.6;
ALTER TABLE "KgMention" ADD COLUMN "confidence" REAL NOT NULL DEFAULT 0.6;

CREATE TABLE "KgSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "nodeCount" INTEGER NOT NULL DEFAULT 0,
    "edgeCount" INTEGER NOT NULL DEFAULT 0,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL,
    "lastIngestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "KgSource_sourceType_sourceId_key" ON "KgSource"("sourceType", "sourceId");
CREATE INDEX "KgSource_sourceType_idx" ON "KgSource"("sourceType");
