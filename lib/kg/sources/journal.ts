import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { JOURNAL_ROOT } from "@/lib/journal/paths";
import { parseJournalFile } from "@/lib/journal/markdown";
import {
  ingestDocumentSource,
  type SourceIngestSummary,
} from "@/lib/kg/sources/common";

async function listJournalFiles(): Promise<string[]> {
  const result: string[] = [];
  let monthDirs: string[];
  try {
    monthDirs = await readdir(JOURNAL_ROOT);
  } catch {
    return result;
  }

  for (const monthDir of monthDirs) {
    const dir = path.join(JOURNAL_ROOT, monthDir);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (file.endsWith(".md")) result.push(path.join(dir, file));
    }
  }

  return result;
}

/** Ingesta un unico archivo de diario (usado por hooks y backfill). */
export async function ingestJournalFile(
  absPath: string,
  options: { model?: string; force?: boolean } = {},
): Promise<SourceIngestSummary | null> {
  const source = await readFile(absPath, "utf-8");
  const relativePath = path
    .relative(process.cwd(), absPath)
    .split(path.sep)
    .join("/");
  const entry = parseJournalFile(source, relativePath);
  if (!entry) return null;

  const outcome = await ingestDocumentSource({
    sourceType: "journal",
    sourceId: entry.id,
    documentPath: relativePath,
    title: entry.title,
    documentMeta: {
      onda: entry.onda,
      campo: entry.campo,
      fechaRegistro: entry.fechaRegistro,
      responsable: entry.responsable,
    },
    body: entry.body,
    sourceMetadata: {
      onda: entry.onda,
      journalPath: relativePath,
    },
    model: options.model,
    force: options.force,
  });

  return {
    sourceId: entry.id,
    title: entry.title,
    skipped: outcome.skipped,
    nodes: outcome.result?.nodeIds.length ?? 0,
    edges: outcome.result?.edgeIds.length ?? 0,
    mentions: outcome.result?.mentionIds.length ?? 0,
  };
}

/** Ingesta todas las entradas del diario al grafo de conocimiento. */
export async function ingestJournalEntries(options: {
  model?: string;
  force?: boolean;
} = {}): Promise<SourceIngestSummary[]> {
  const files = await listJournalFiles();
  const summaries: SourceIngestSummary[] = [];

  for (const absPath of files) {
    const summary = await ingestJournalFile(absPath, options);
    if (summary) summaries.push(summary);
  }

  return summaries;
}
