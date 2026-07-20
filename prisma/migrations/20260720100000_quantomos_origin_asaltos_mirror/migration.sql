-- Quantomos, OriginAttribution y espejo KgEdge.reconocido

ALTER TABLE "KgEdge" ADD COLUMN "reconocido" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "OriginAttribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "timestampExacto" DATETIME NOT NULL,
    "diaSemana" TEXT NOT NULL,
    "locationName" TEXT,
    "actors" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Quantomo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titleSugerido" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tagsSemanticos" JSONB NOT NULL DEFAULT '[]',
    "universo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originAttributionId" TEXT NOT NULL,
    CONSTRAINT "Quantomo_originAttributionId_fkey" FOREIGN KEY ("originAttributionId") REFERENCES "OriginAttribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OriginAttribution_channel_idx" ON "OriginAttribution"("channel");
CREATE INDEX "OriginAttribution_timestampExacto_idx" ON "OriginAttribution"("timestampExacto");
CREATE INDEX "Quantomo_universo_idx" ON "Quantomo"("universo");
CREATE INDEX "Quantomo_originAttributionId_idx" ON "Quantomo"("originAttributionId");
CREATE INDEX "Quantomo_createdAt_idx" ON "Quantomo"("createdAt");
CREATE INDEX "KgEdge_reconocido_idx" ON "KgEdge"("reconocido");
