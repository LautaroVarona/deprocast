-- Triage Mastropiero: EntityCandidate (reemplaza CandidateEntity legacy si existía).

CREATE TABLE IF NOT EXISTS "EntityCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contextSnippet" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedNodeId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "EntityCandidate_status_createdAt_idx" ON "EntityCandidate"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "EntityCandidate_type_status_idx" ON "EntityCandidate"("type", "status");
CREATE INDEX IF NOT EXISTS "EntityCandidate_sourceId_idx" ON "EntityCandidate"("sourceId");
CREATE INDEX IF NOT EXISTS "EntityCandidate_name_idx" ON "EntityCandidate"("name");

-- Migrar filas legacy CandidateEntity → EntityCandidate si existía la tabla anterior.
INSERT INTO "EntityCandidate" (
  "id", "name", "type", "contextSnippet", "sourceId", "status", "resolvedNodeId", "metadata", "createdAt", "updatedAt"
)
SELECT
  "id",
  "name",
  CASE
    WHEN UPPER("type") IN ('PERSON', 'PERSONA') THEN 'PERSON'
    WHEN UPPER("type") IN ('PROJECT', 'PROYECTO') THEN 'PROJECT'
    ELSE 'PERSON'
  END,
  COALESCE(NULLIF(TRIM("sourceContext"), ''), 'Extracción sin fragmento de contexto.'),
  NULL,
  CASE
    WHEN UPPER("status") IN ('PENDING', 'APPROVED', 'REJECTED', 'MERGED') THEN UPPER("status")
    ELSE 'PENDING'
  END,
  NULL,
  COALESCE("metadata", '{}'),
  "createdAt",
  "updatedAt"
FROM "CandidateEntity"
WHERE NOT EXISTS (
  SELECT 1 FROM "EntityCandidate" ec WHERE ec."id" = "CandidateEntity"."id"
);
