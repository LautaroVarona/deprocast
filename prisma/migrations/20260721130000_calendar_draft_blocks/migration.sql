-- Calendario draft: blockKind, actionCost, executionStatus, ecosystemArea, endsAt, durationMin
ALTER TABLE "ContextEvent" ADD COLUMN "blockKind" TEXT NOT NULL DEFAULT 'ROUTINE';
ALTER TABLE "ContextEvent" ADD COLUMN "actionCost" INTEGER;
ALTER TABLE "ContextEvent" ADD COLUMN "executionStatus" TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE "ContextEvent" ADD COLUMN "ecosystemArea" TEXT;
ALTER TABLE "ContextEvent" ADD COLUMN "endsAt" DATETIME;
ALTER TABLE "ContextEvent" ADD COLUMN "durationMin" INTEGER;

-- Backfill blockKind
UPDATE "ContextEvent"
SET "blockKind" = 'SUGGESTION'
WHERE "status" = 'proposed';

UPDATE "ContextEvent"
SET "blockKind" = 'IMMUTABLE'
WHERE "status" = 'confirmed'
  AND "source" IN ('manual', 'import')
  AND (
    "content" LIKE '%Varona%'
    OR "content" LIKE '%jornada%'
    OR "content" LIKE '%reunión%'
    OR "content" LIKE '%reunion%'
    OR "content" LIKE '%entrega%'
  );

UPDATE "ContextEvent"
SET "blockKind" = 'ROUTINE'
WHERE "blockKind" = 'ROUTINE'
  AND "status" = 'confirmed'
  AND "pillar" IN ('rendimiento', 'combustible', 'recuperacion', 'estado_base');

-- Backfill ecosystemArea from pillar
UPDATE "ContextEvent"
SET "ecosystemArea" = 'salud'
WHERE "ecosystemArea" IS NULL
  AND "pillar" IN ('rendimiento', 'combustible', 'recuperacion', 'estado_base');

UPDATE "ContextEvent"
SET "ecosystemArea" = 'tecnologia'
WHERE "ecosystemArea" IS NULL
  AND "pillar" = 'proyecto';

UPDATE "ContextEvent"
SET "ecosystemArea" = 'meta'
WHERE "ecosystemArea" IS NULL
  AND "pillar" = 'general';

-- Indexes
CREATE INDEX "ContextEvent_blockKind_occurredAt_idx" ON "ContextEvent"("blockKind", "occurredAt");
CREATE INDEX "ContextEvent_ecosystemArea_occurredAt_idx" ON "ContextEvent"("ecosystemArea", "occurredAt");
CREATE INDEX "ContextEvent_executionStatus_occurredAt_idx" ON "ContextEvent"("executionStatus", "occurredAt");
