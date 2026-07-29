-- Atanor Temporal: sesión diaria unificada (hilos + contexto + mensajes)

CREATE TABLE "DailySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "summaryMarkdown" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "DailySession_date_key" ON "DailySession"("date");

CREATE TABLE "SessionThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailySessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SessionThread_dailySessionId_fkey" FOREIGN KEY ("dailySessionId") REFERENCES "DailySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SessionThread_dailySessionId_idx" ON "SessionThread"("dailySessionId");

CREATE TABLE "ThreadContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "tagType" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "tagLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThreadContext_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SessionThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ThreadContext_threadId_idx" ON "ThreadContext"("threadId");
CREATE UNIQUE INDEX "ThreadContext_threadId_tagType_tagId_key" ON "ThreadContext"("threadId", "tagType", "tagId");

CREATE TABLE "ThreadMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SessionThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ThreadMessage_threadId_createdAt_idx" ON "ThreadMessage"("threadId", "createdAt");
