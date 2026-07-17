import fs from "node:fs";

import Database from "better-sqlite3";

import { getDatabaseFilePath } from "@/lib/runtime-paths";

const MAGO_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "MagoColeccion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL DEFAULT '',
  "kind" TEXT NOT NULL DEFAULT 'generic',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "MagoColeccionItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "coleccionId" TEXT NOT NULL,
  "slot" INTEGER NOT NULL,
  "titulo" TEXT NOT NULL DEFAULT '',
  "contenido" TEXT NOT NULL DEFAULT '',
  "refKind" TEXT NOT NULL DEFAULT 'none',
  "refId" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  CONSTRAINT "MagoColeccionItem_coleccionId_fkey" FOREIGN KEY ("coleccionId") REFERENCES "MagoColeccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MagoColeccionItem_coleccionId_slot_key"
  ON "MagoColeccionItem"("coleccionId", "slot");

CREATE INDEX IF NOT EXISTS "MagoColeccionItem_refKind_refId_idx"
  ON "MagoColeccionItem"("refKind", "refId");
`;

function magoTableExists(dbPath: string, tableName: string): boolean {
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

/** prisma db push falla con JSONB en SQLite; creamos tablas Mago a mano si faltan. */
export function ensureMagoTables(): void {
  const dbPath = getDatabaseFilePath();
  if (
    magoTableExists(dbPath, "MagoColeccion") &&
    magoTableExists(dbPath, "MagoColeccionItem")
  ) {
    return;
  }

  const db = new Database(dbPath);
  try {
    db.exec(MAGO_TABLES_SQL);
  } finally {
    db.close();
  }
}

/** Tablas SQLite + cliente Prisma con delegados Mago (post-generate). */
export async function ensureMagoRuntime(): Promise<void> {
  ensureMagoTables();

  const { getPrismaClient, resetPrismaClient } = await import("@/lib/prisma");
  const client = getPrismaClient();
  if (client.magoColeccion) {
    return;
  }

  resetPrismaClient();
  const fresh = getPrismaClient();
  if (!fresh.magoColeccion) {
    throw new Error(
      "Prisma Client sin modelo MagoColeccion. Ejecutá `npx prisma generate` y reiniciá el servidor de desarrollo.",
    );
  }
}
