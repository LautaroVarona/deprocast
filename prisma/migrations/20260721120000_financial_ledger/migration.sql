-- CreateTable: FinancialTransaction
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "concept" TEXT NOT NULL,
    "vendor" TEXT,
    "incomeCategory" TEXT,
    "expenseTier" TEXT,
    "projectLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceChannel" TEXT NOT NULL,
    "sourceRaw" TEXT,
    "confidence" REAL,
    "occurredAt" DATETIME NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: FinancialCapital (singleton)
CREATE TABLE "FinancialCapital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "FinancialCapital" ("id", "amount", "currency", "note", "createdAt", "updatedAt")
VALUES ('operator', 0, 'EUR', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CreateIndex
CREATE INDEX "FinancialTransaction_status_occurredAt_idx" ON "FinancialTransaction"("status", "occurredAt");
CREATE INDEX "FinancialTransaction_type_status_idx" ON "FinancialTransaction"("type", "status");
CREATE INDEX "FinancialTransaction_expenseTier_status_idx" ON "FinancialTransaction"("expenseTier", "status");
CREATE INDEX "FinancialTransaction_occurredAt_idx" ON "FinancialTransaction"("occurredAt");
