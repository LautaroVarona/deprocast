-- CreateTable
CREATE TABLE "Notebook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverHue" INTEGER NOT NULL DEFAULT 220,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotebookPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notebookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "semanticVector" TEXT,
    "structuralVector" JSONB,
    "quanta" JSONB,
    "processedAt" DATETIME,
    "corpusCaptureId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotebookPage_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Notebook_createdAt_idx" ON "Notebook"("createdAt");

-- CreateIndex
CREATE INDEX "NotebookPage_notebookId_idx" ON "NotebookPage"("notebookId");

-- CreateIndex
CREATE INDEX "NotebookPage_status_idx" ON "NotebookPage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NotebookPage_notebookId_pageNumber_key" ON "NotebookPage"("notebookId", "pageNumber");
