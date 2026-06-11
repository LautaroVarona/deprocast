import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseLaboralCsv } from "@/lib/laboral/csv-parser";
import {
  buildChallengeFilename,
  buildChallengeMarkdown,
  parseChallengeFile,
} from "@/lib/laboral/markdown";
import type { ImportResult, LaboralChallenge } from "@/lib/laboral/types";

export const LABORAL_PENDING_DIR = path.join(
  process.cwd(),
  "data",
  "projects",
  "laboral",
  "pending",
);

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function importLaboralCsv(csvContent: string): Promise<ImportResult> {
  await mkdir(LABORAL_PENDING_DIR, { recursive: true });

  const rows = parseLaboralCsv(csvContent);
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    files: [],
    errors: [],
  };

  for (const row of rows) {
    try {
      const filename = buildChallengeFilename(row);
      const filePath = path.join(LABORAL_PENDING_DIR, filename);
      const markdown = buildChallengeMarkdown(row);

      await writeFile(filePath, markdown, "utf-8");
      result.imported += 1;
      result.files.push(filename);
    } catch (error) {
      result.skipped += 1;
      const message =
        error instanceof Error ? error.message : "Error desconocido al importar fila";
      result.errors.push(`[${row.id}] ${row.title}: ${message}`);
    }
  }

  return result;
}

export async function listLaboralChallenges(): Promise<LaboralChallenge[]> {
  if (!(await fileExists(LABORAL_PENDING_DIR))) {
    return [];
  }

  const entries = await readdir(LABORAL_PENDING_DIR, { withFileTypes: true });
  const challenges: LaboralChallenge[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const content = await readFile(
      path.join(LABORAL_PENDING_DIR, entry.name),
      "utf-8",
    );
    const parsed = parseChallengeFile(entry.name, content);
    if (parsed) challenges.push(parsed);
  }

  return challenges.sort((a, b) => {
    if (b.baseWeight !== a.baseWeight) return b.baseWeight - a.baseWeight;
    return a.title.localeCompare(b.title, "es");
  });
}
