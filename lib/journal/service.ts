import { buildJournalMarkdown, parseJournalFile } from "@/lib/journal/markdown";
import { indexJournalMemory } from "@/lib/mnemosyne/hooks";
import {
  formatFechaRegistro,
  getMonthDir,
  getMonthDirName,
  JOURNAL_ROOT,
} from "@/lib/journal/paths";
import type {
  JournalEntryDetail,
  JournalEntrySummary,
  JournalOnda,
  SaveJournalInput,
} from "@/lib/journal/types";
import { access, mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "node:path";

export type SaveJournalResult = {
  id: string;
  title: string;
  onda: JournalOnda;
  fechaRegistro: string;
  relativePath: string;
  filename: string;
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeQuery(query?: string): string[] {
  if (!query?.trim()) return [];
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function matchesQuery(entry: JournalEntrySummary, tokens: string[]): boolean {
  if (tokens.length === 0) return true;

  const haystack = [
    entry.title,
    entry.onda,
    entry.previewLines.join(" "),
    entry.fechaRegistro,
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return tokens.every((token) => haystack.includes(token));
}

async function readEntriesFromMonthDir(
  monthDir: string,
  monthDirName: string,
): Promise<JournalEntryDetail[]> {
  let files: string[];
  try {
    files = await readdir(monthDir);
  } catch {
    return [];
  }

  const entries: JournalEntryDetail[] = [];

  for (const filename of files) {
    if (!filename.endsWith(".md")) continue;

    const filePath = path.join(monthDir, filename);
    const source = await readFile(filePath, "utf-8");
    const relativePath = path.posix.join("journal", monthDirName, filename);
    const parsed = parseJournalFile(source, relativePath);
    if (parsed) entries.push(parsed);
  }

  return entries.sort((a, b) =>
    b.fechaRegistro.localeCompare(a.fechaRegistro),
  );
}

export async function saveJournalEntry({
  content,
  onda,
}: SaveJournalInput): Promise<SaveJournalResult> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("El contenido del diario no puede estar vacío.");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthDirName = getMonthDirName(year, month);
  const monthDir = getMonthDir(year, month);

  await mkdir(monthDir, { recursive: true });

  const { markdown, id, title, timestamp } = buildJournalMarkdown(
    trimmed,
    onda,
    now,
  );

  let filename = `${timestamp}_diario.md`;
  let suffix = 1;
  while (await fileExists(path.join(monthDir, filename))) {
    filename = `${timestamp}_diario-${suffix}.md`;
    suffix += 1;
  }

  const filePath = path.join(monthDir, filename);
  await writeFile(filePath, markdown, "utf-8");

  const relativePath = path.posix.join("journal", monthDirName, filename);

  const result = {
    id,
    title,
    onda,
    fechaRegistro: formatFechaRegistro(now),
    relativePath,
    filename,
  };

  void indexJournalMemory({
    id,
    title,
    body: trimmed,
    relativePath,
    onda,
  }).catch((error) => {
    console.error("Mnemosyne journal index error:", error);
  });

  return result;
}

export async function listJournalEntries(options: {
  year: number;
  month: number;
  query?: string;
}): Promise<{
  entries: JournalEntrySummary[];
  daysWithEntries: number[];
}> {
  const monthDirName = getMonthDirName(options.year, options.month);
  const monthDir = getMonthDir(options.year, options.month);
  const tokens = normalizeQuery(options.query);

  const allEntries = await readEntriesFromMonthDir(monthDir, monthDirName);
  const filtered = allEntries.filter((entry) => matchesQuery(entry, tokens));

  const daysWithEntries = [
    ...new Set(allEntries.map((entry) => entry.day)),
  ].sort((a, b) => a - b);

  return {
    entries: filtered.map(
      ({
        id,
        title,
        onda,
        fechaRegistro,
        previewLines,
        relativePath,
        day,
      }) => ({
        id,
        title,
        onda,
        fechaRegistro,
        previewLines,
        relativePath,
        day,
      }),
    ),
    daysWithEntries,
  };
}

export async function getJournalEntry(
  id: string,
): Promise<JournalEntryDetail | null> {
  let monthDirs: string[];
  try {
    monthDirs = await readdir(JOURNAL_ROOT);
  } catch {
    return null;
  }

  for (const monthDirName of monthDirs) {
    const monthDir = path.join(JOURNAL_ROOT, monthDirName);
    const entries = await readEntriesFromMonthDir(monthDir, monthDirName);
    const found = entries.find((entry) => entry.id === id);
    if (found) return found;
  }

  return null;
}
