-- Core audio/transcription tables (baseline para deploys limpios en Vercel).

CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "durationMs" INTEGER,
    "originalCreatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "partialText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transcript_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AudioAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ParentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transcriptId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "startTimeMs" INTEGER NOT NULL,
    "endTimeMs" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    CONSTRAINT "ParentChunk_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ChildChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    CONSTRAINT "ChildChunk_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Entity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

CREATE TABLE "ParentChunkEntity" (
    "parentChunkId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "ParentChunkEntity_parentChunkId_fkey" FOREIGN KEY ("parentChunkId") REFERENCES "ParentChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentChunkEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("parentChunkId", "entityId")
);

CREATE TABLE "ParentChunkTag" (
    "parentChunkId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "ParentChunkTag_parentChunkId_fkey" FOREIGN KEY ("parentChunkId") REFERENCES "ParentChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentChunkTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("parentChunkId", "tagId")
);

CREATE INDEX "AudioAsset_status_idx" ON "AudioAsset"("status");
CREATE UNIQUE INDEX "Transcript_assetId_key" ON "Transcript"("assetId");
CREATE INDEX "ParentChunk_transcriptId_idx" ON "ParentChunk"("transcriptId");
CREATE INDEX "ChildChunk_parentId_idx" ON "ChildChunk"("parentId");
CREATE UNIQUE INDEX "Entity_name_key" ON "Entity"("name");
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
