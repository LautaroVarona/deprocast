-- Vibe Calibrator: sesiones y votos de peso (1–12)
-- Aplicado vía `prisma db push` sobre la base de desarrollo existente.

CREATE TABLE "VibeCalibrationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "config" JSONB NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

CREATE TABLE "VibeCalibrationVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "cardSource" TEXT NOT NULL,
    "sourceRef" TEXT,
    "weight" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "votedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VibeCalibrationVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VibeCalibrationSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "VibeCalibrationVote_sessionId_idx" ON "VibeCalibrationVote"("sessionId");
CREATE INDEX "VibeCalibrationVote_cardId_idx" ON "VibeCalibrationVote"("cardId");
