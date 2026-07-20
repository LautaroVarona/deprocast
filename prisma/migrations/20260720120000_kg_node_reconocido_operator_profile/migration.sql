-- AlterTable: KgNode.reconocido (HITL gate for graph visibility)
ALTER TABLE "KgNode" ADD COLUMN "reconocido" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: preserve existing graph as validated
UPDATE "KgNode" SET "reconocido" = true;

-- CreateIndex
CREATE INDEX "KgNode_reconocido_idx" ON "KgNode"("reconocido");

-- CreateTable: OperatorProfile singleton for /yo
CREATE TABLE "OperatorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL DEFAULT 'Lautaro',
    "operationalStatus" TEXT NOT NULL DEFAULT 'OPERATIVO',
    "energyLevel" INTEGER NOT NULL DEFAULT 6,
    "calibration" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "OperatorProfile" ("id", "displayName", "operationalStatus", "energyLevel", "calibration", "createdAt", "updatedAt")
VALUES ('operator', 'Lautaro', 'OPERATIVO', 6, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
