-- Knowledge Graph tables (applied via prisma db push on existing dev database)

CREATE TABLE "KgNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "primaryName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aliases" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "KgEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "weight" INTEGER,
    "metadata" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KgEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KgEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "KgMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "fragment" TEXT NOT NULL,
    "offsetStart" INTEGER,
    "offsetEnd" INTEGER,
    "metadata" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KgMention_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KgNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KgNode_primaryName_type_key" ON "KgNode"("primaryName", "type");
CREATE INDEX "KgNode_type_idx" ON "KgNode"("type");
CREATE INDEX "KgNode_primaryName_idx" ON "KgNode"("primaryName");
CREATE UNIQUE INDEX "KgEdge_sourceNodeId_targetNodeId_relationType_key" ON "KgEdge"("sourceNodeId", "targetNodeId", "relationType");
CREATE INDEX "KgEdge_sourceNodeId_idx" ON "KgEdge"("sourceNodeId");
CREATE INDEX "KgEdge_targetNodeId_idx" ON "KgEdge"("targetNodeId");
CREATE INDEX "KgEdge_relationType_idx" ON "KgEdge"("relationType");
CREATE INDEX "KgMention_sourceType_sourceId_idx" ON "KgMention"("sourceType", "sourceId");
CREATE INDEX "KgMention_nodeId_idx" ON "KgMention"("nodeId");
