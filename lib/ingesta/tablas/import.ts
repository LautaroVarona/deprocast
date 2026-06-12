import { DEFAULT_CAMPO_SLUG, isCampoSlug } from "@/lib/projects/campos";
import { mapTableColumns } from "@/lib/ingesta/tablas/column-mapper";
import {
  buildTableProjectFilename,
  buildTableProjectMarkdown,
  mapRecordToProjectRow,
} from "@/lib/ingesta/tablas/markdown";
import { parseStructuredTable } from "@/lib/ingesta/tablas/parser";
import type { TableImportOptions, TableImportResult } from "@/lib/ingesta/tablas/types";
import { getProjectDir } from "@/lib/projects/paths";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function importStructuredTable(
  options: TableImportOptions,
): Promise<TableImportResult> {
  const { buffer, filename } = options;
  const explicitCampoSlug =
    options.campoSlug && isCampoSlug(options.campoSlug) ? options.campoSlug : null;
  const resolvedCampoSlug = explicitCampoSlug ?? DEFAULT_CAMPO_SLUG;
  const isRawMatter = resolvedCampoSlug === DEFAULT_CAMPO_SLUG;

  const { headers, records } = await parseStructuredTable(buffer, filename);

  if (headers.length === 0) {
    throw new Error("La tabla no contiene cabeceras reconocibles.");
  }

  const columnMapping = mapTableColumns(headers);
  const mappedHeaders = new Set(Object.values(columnMapping).filter(Boolean));

  const targetDir = getProjectDir(resolvedCampoSlug);

  await mkdir(targetDir, { recursive: true });

  const result: TableImportResult = {
    imported: 0,
    skipped: 0,
    totalRows: records.length,
    files: [],
    errors: [],
    columnMapping,
  };

  for (const record of records) {
    try {
      const row = mapRecordToProjectRow(record, columnMapping, mappedHeaders);
      if (!row) {
        result.skipped += 1;
        continue;
      }

      const markdown = buildTableProjectMarkdown(row, resolvedCampoSlug, {
        isRawMatter,
      });
      const fileName = buildTableProjectFilename(row);
      const filePath = path.join(targetDir, fileName);

      await writeFile(filePath, markdown, "utf-8");
      result.imported += 1;
      result.files.push(path.relative(process.cwd(), filePath));
    } catch (error) {
      result.skipped += 1;
      const message =
        error instanceof Error ? error.message : "Error desconocido al importar fila";
      result.errors.push(message);
    }
  }

  return result;
}
