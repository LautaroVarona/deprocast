import "server-only";

import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { prisma } from "@/lib/prisma";

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
  );
  return rows.length > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  if (!(await tableExists(tableName))) {
    return false;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("${tableName}")`,
  );
  return rows.some((row) => row.name === columnName);
}

/** Aplica migración Babel en SQLite local si las tablas aún no existen. */
export async function ensureBabelSchema(): Promise<void> {
  const hasUniverse = await tableExists("Universe");

  if (!hasUniverse) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Universe" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "slug" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "trenchesWeight" INTEGER,
        "isRoot" INTEGER NOT NULL DEFAULT 0,
        "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Universe_slug_key" ON "Universe"("slug");`,
    );
  }

  if (!(await tableExists("BabelRecord"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "BabelRecord" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "kind" TEXT NOT NULL,
        "physicalRef" TEXT NOT NULL,
        "contentPreview" TEXT NOT NULL DEFAULT '',
        "occurredAt" DATETIME NOT NULL,
        "contextSeal" TEXT NOT NULL,
        "campoSlug" TEXT,
        "channel" TEXT,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BabelRecord_contextSeal_fkey" FOREIGN KEY ("contextSeal") REFERENCES "Universe" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "BabelRecord_contextSeal_occurredAt_idx" ON "BabelRecord"("contextSeal", "occurredAt");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "BabelRecord_kind_physicalRef_idx" ON "BabelRecord"("kind", "physicalRef");`,
    );
  }

  if (!(await tableExists("UniverseProjection"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "UniverseProjection" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "targetSlug" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "physicalRef" TEXT NOT NULL,
        "sourceSlug" TEXT NOT NULL,
        "scope" TEXT,
        "scopeRef" TEXT,
        "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UniverseProjection_targetSlug_fkey" FOREIGN KEY ("targetSlug") REFERENCES "Universe" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UniverseProjection_targetSlug_kind_physicalRef_key" ON "UniverseProjection"("targetSlug", "kind", "physicalRef");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "UniverseProjection_targetSlug_idx" ON "UniverseProjection"("targetSlug");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "UniverseProjection_sourceSlug_idx" ON "UniverseProjection"("sourceSlug");`,
    );
  }

  if (await tableExists("PendingTask")) {
    if (!(await columnExists("PendingTask", "universeSlug"))) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "PendingTask" ADD COLUMN "universeSlug" TEXT;`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "PendingTask_universeSlug_status_targetDay_idx" ON "PendingTask"("universeSlug", "status", "targetDay");`,
      );
    }
  }

  if (await tableExists("ChatSession")) {
    if (!(await columnExists("ChatSession", "universeSlug"))) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ChatSession" ADD COLUMN "universeSlug" TEXT;`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ChatSession_universeSlug_updatedAt_idx" ON "ChatSession"("universeSlug", "updatedAt");`,
      );
    }
  }

  const babelCount = await prisma.universe.count({
    where: { slug: ROOT_UNIVERSE_SLUG },
  });

  if (babelCount === 0) {
    await prisma.universe.create({
      data: {
        slug: ROOT_UNIVERSE_SLUG,
        label: "Babel",
        description: "Universo raíz — red de captura principal del sistema.",
        isRoot: true,
      },
    });
  }
}
