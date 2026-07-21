-- CreateTable: NutritionEntry
CREATE TABLE "NutritionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summary" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "sourceRaw" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "parsedBy" TEXT NOT NULL,
    "confidence" REAL,
    "totalCalories" REAL,
    "totalProtein" REAL,
    "totalCarbs" REAL,
    "totalFat" REAL,
    "notes" TEXT,
    "healthRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NutritionEntry_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: NutritionItem
CREATE TABLE "NutritionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "grams" REAL,
    "calories" REAL,
    "protein" REAL,
    "carbs" REAL,
    "fat" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionItem_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "NutritionEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: TrainingSession
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summary" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "sourceRaw" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "parsedBy" TEXT NOT NULL,
    "confidence" REAL,
    "durationMin" INTEGER,
    "totalVolumeKg" REAL,
    "intensity" TEXT,
    "notes" TEXT,
    "healthRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingSession_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: TrainingSet
CREATE TABLE "TrainingSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "series" INTEGER,
    "reps" INTEGER,
    "weightKg" REAL,
    "durationMin" INTEGER,
    "distanceKm" REAL,
    "intensity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NutritionEntry_occurredAt_idx" ON "NutritionEntry"("occurredAt");
CREATE INDEX "NutritionEntry_sourceChannel_occurredAt_idx" ON "NutritionEntry"("sourceChannel", "occurredAt");
CREATE INDEX "NutritionEntry_healthRecordId_idx" ON "NutritionEntry"("healthRecordId");

CREATE INDEX "NutritionItem_entryId_idx" ON "NutritionItem"("entryId");

CREATE INDEX "TrainingSession_occurredAt_idx" ON "TrainingSession"("occurredAt");
CREATE INDEX "TrainingSession_sourceChannel_occurredAt_idx" ON "TrainingSession"("sourceChannel", "occurredAt");
CREATE INDEX "TrainingSession_healthRecordId_idx" ON "TrainingSession"("healthRecordId");

CREATE INDEX "TrainingSet_sessionId_idx" ON "TrainingSet"("sessionId");
