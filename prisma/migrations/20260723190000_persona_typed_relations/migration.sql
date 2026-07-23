-- Vínculos tipados Persona↔Persona / Persona↔Proyecto + cola de candidatas.

CREATE TABLE "PersonToPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "relationContext" TEXT NOT NULL,
    "relationType" TEXT,
    "strength" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonToPerson_personAId_fkey" FOREIGN KEY ("personAId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonToPerson_personBId_fkey" FOREIGN KEY ("personBId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PersonToPerson_personAId_personBId_key" ON "PersonToPerson"("personAId", "personBId");
CREATE INDEX "PersonToPerson_personAId_idx" ON "PersonToPerson"("personAId");
CREATE INDEX "PersonToPerson_personBId_idx" ON "PersonToPerson"("personBId");

CREATE TABLE "PersonToProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "relationContext" TEXT NOT NULL,
    "relationType" TEXT,
    "strength" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonToProject_personId_fkey" FOREIGN KEY ("personId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonToProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PersonToProject_personId_projectId_key" ON "PersonToProject"("personId", "projectId");
CREATE INDEX "PersonToProject_personId_idx" ON "PersonToProject"("personId");
CREATE INDEX "PersonToProject_projectId_idx" ON "PersonToProject"("projectId");

CREATE TABLE "CandidateEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "sourceContext" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "CandidateEntity_status_createdAt_idx" ON "CandidateEntity"("status", "createdAt");
CREATE INDEX "CandidateEntity_type_status_idx" ON "CandidateEntity"("type", "status");
CREATE INDEX "CandidateEntity_name_idx" ON "CandidateEntity"("name");
