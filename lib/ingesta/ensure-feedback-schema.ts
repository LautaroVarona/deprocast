import fs from "node:fs";

import Database from "better-sqlite3";

import { getDatabaseFilePath } from "@/lib/runtime-paths";

const FEEDBACK_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "FeedbackSignal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "action" TEXT NOT NULL,
  "polarity" TEXT NOT NULL DEFAULT 'positive',
  "targetKind" TEXT NOT NULL,
  "targetId" TEXT,
  "fieldPath" TEXT,
  "previousValue" TEXT,
  "nextValue" TEXT,
  "channel" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FeedbackSignal_action_createdAt_idx"
  ON "FeedbackSignal"("action", "createdAt");

CREATE INDEX IF NOT EXISTS "FeedbackSignal_targetKind_targetId_idx"
  ON "FeedbackSignal"("targetKind", "targetId");

CREATE INDEX IF NOT EXISTS "FeedbackSignal_channel_idx"
  ON "FeedbackSignal"("channel");
`;

function tableExists(dbPath: string, tableName: string): boolean {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get(tableName) as { ok: number } | undefined;
    return Boolean(row);
  } finally {
    db.close();
  }
}

/** prisma db push falla con JSON defaults en SQLite; bootstrap manual. */
export function ensureFeedbackSignalTable(): void {
  const dbPath = getDatabaseFilePath();
  if (tableExists(dbPath, "FeedbackSignal")) {
    return;
  }

  const db = new Database(dbPath);
  try {
    db.exec(FEEDBACK_TABLE_SQL);
  } finally {
    db.close();
  }
}

export async function ensureFeedbackRuntime(): Promise<void> {
  ensureFeedbackSignalTable();

  const { getPrismaClient, resetPrismaClient } = await import("@/lib/prisma");
  const client = getPrismaClient();
  if (client.feedbackSignal) {
    return;
  }

  resetPrismaClient();
}
