import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import {
  EXPORT_META_TABLE,
  mergeTableSpecsForDomains,
  sortTablesForDelete,
  sortTablesForInsert,
  type ExportDomainId,
  type MergedTableSpec,
} from "@/lib/backup/domains";

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function getTableCreateSql(
  db: Database.Database,
  table: string,
  schema: "main" | "src" | "backup" = "main",
): string | null {
  const prefix = schema === "main" ? "" : `${schema}.`;
  const row = db
    .prepare(
      `SELECT sql FROM ${prefix}sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(table) as { sql: string | null } | undefined;

  return row?.sql ?? null;
}

function tableExists(
  db: Database.Database,
  table: string,
  schema: "main" | "src" | "backup" = "main",
): boolean {
  const prefix = schema === "main" ? "" : `${schema}.`;
  const row = db
    .prepare(
      `SELECT name FROM ${prefix}sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(table) as { name: string } | undefined;

  return Boolean(row);
}

function createExportMetaTable(
  db: Database.Database,
  includedDomains: ExportDomainId[],
): void {
  db.exec(`CREATE TABLE ${quoteIdentifier(EXPORT_META_TABLE)} (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`);

  const insert = db.prepare(
    `INSERT INTO ${quoteIdentifier(EXPORT_META_TABLE)} (key, value) VALUES (?, ?)`,
  );
  insert.run("exportMode", "partial");
  insert.run("includedDomains", JSON.stringify(includedDomains));
  insert.run("exportedAt", new Date().toISOString());
}

export async function buildPartialDatabaseBuffer(
  sourceDbPath: string,
  domainIds: ExportDomainId[],
): Promise<Buffer> {
  const specs = mergeTableSpecsForDomains(domainIds);
  const tempPath = path.join(
    os.tmpdir(),
    `deprocast-partial-export-${Date.now()}.sqlite`,
  );

  const target = new Database(tempPath);
  const escapedSource = sourceDbPath.replace(/'/g, "''");

  try {
    target.pragma("foreign_keys = OFF");
    createExportMetaTable(target, domainIds);
    target.exec(`ATTACH DATABASE '${escapedSource}' AS src`);

    for (const spec of sortTablesForInsert(specs)) {
      if (!tableExists(target, spec.table, "src")) {
        continue;
      }

      const createSql = getTableCreateSql(target, spec.table, "src");
      if (!createSql) {
        continue;
      }

      if (!tableExists(target, spec.table, "main")) {
        target.exec(createSql);
      }

      const quoted = quoteIdentifier(spec.table);
      const whereClause = spec.whereSql ? ` WHERE ${spec.whereSql}` : "";
      target.exec(
        `INSERT INTO main.${quoted} SELECT * FROM src.${quoted}${whereClause}`,
      );
    }

    target.close();

    const buffer = await fs.promises.readFile(tempPath);
    await fs.promises.unlink(tempPath).catch(() => undefined);

    return buffer;
  } catch (error) {
    target.close();
    await fs.promises.unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export function mergePartialDatabaseIntoLive(
  liveDbPath: string,
  partialDbPath: string,
  domainIds: ExportDomainId[],
): void {
  const specs = mergeTableSpecsForDomains(domainIds);
  const live = new Database(liveDbPath);
  const escapedPartial = partialDbPath.replace(/'/g, "''");

  try {
    live.pragma("foreign_keys = OFF");
    live.exec(`ATTACH DATABASE '${escapedPartial}' AS backup`);

    for (const spec of sortTablesForDelete(specs)) {
      if (!tableExists(live, spec.table, "main")) {
        continue;
      }

      const quoted = quoteIdentifier(spec.table);
      if (spec.whereSql) {
        live.exec(`DELETE FROM main.${quoted} WHERE ${spec.whereSql}`);
      } else {
        live.exec(`DELETE FROM main.${quoted}`);
      }
    }

    for (const spec of sortTablesForInsert(specs)) {
      if (!tableExists(live, spec.table, "backup")) {
        continue;
      }

      const quoted = quoteIdentifier(spec.table);
      live.exec(`INSERT INTO main.${quoted} SELECT * FROM backup.${quoted}`);
    }

    live.close();
  } catch (error) {
    live.close();
    throw error;
  }
}

export function isPartialExportDatabase(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    if (!tableExists(db, EXPORT_META_TABLE, "main")) {
      return false;
    }

    const row = db
      .prepare(
        `SELECT value FROM ${quoteIdentifier(EXPORT_META_TABLE)} WHERE key = 'exportMode'`,
      )
      .get() as { value: string } | undefined;

    return row?.value === "partial";
  } finally {
    db.close();
  }
}

export function readPartialExportDomains(dbPath: string): ExportDomainId[] {
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare(
        `SELECT value FROM ${quoteIdentifier(EXPORT_META_TABLE)} WHERE key = 'includedDomains'`,
      )
      .get() as { value: string } | undefined;

    if (!row?.value) {
      return [];
    }

    return JSON.parse(row.value) as ExportDomainId[];
  } finally {
    db.close();
  }
}

export function countRowsForSpecs(
  dbPath: string,
  specs: MergedTableSpec[],
): number {
  if (!fs.existsSync(dbPath)) {
    return 0;
  }

  const db = new Database(dbPath, { readonly: true });
  let total = 0;

  try {
    for (const spec of specs) {
      if (!tableExists(db, spec.table, "main")) {
        continue;
      }

      const quoted = quoteIdentifier(spec.table);
      const whereClause = spec.whereSql ? ` WHERE ${spec.whereSql}` : "";
      const row = db
        .prepare(`SELECT COUNT(*) AS count FROM ${quoted}${whereClause}`)
        .get() as { count: number };

      total += row.count;
    }
  } finally {
    db.close();
  }

  return total;
}
