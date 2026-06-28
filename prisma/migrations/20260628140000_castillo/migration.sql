-- CreateTable
CREATE TABLE "CastleGrid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CastleCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gridId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "accent" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "layout" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CastleCard_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "CastleGrid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CastleCard_gridId_idx" ON "CastleCard"("gridId");

-- CreateIndex
CREATE INDEX "CastleCard_sourceType_sourceId_idx" ON "CastleCard"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CastleCard_gridId_sourceType_sourceId_key" ON "CastleCard"("gridId", "sourceType", "sourceId");
