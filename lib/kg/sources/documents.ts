import type { GenerativeModel } from "@google-cloud/vertexai";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  ingestDocumentSource,
  type SourceIngestSummary,
} from "@/lib/kg/sources/common";

const RAW_DOCUMENT_DIRS = [
  path.join(process.cwd(), "data", "raw_documents", "pending"),
  path.join(process.cwd(), "data", "raw_documents", "completed"),
];

function parseFrontmatter(source: string): Record<string, string> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return fields;
}

function stripFrontmatter(source: string): string {
  return source.replace(/^---[\s\S]*?---\r?\n?/, "").trim();
}

/** Ingesta un unico documento crudo por ruta absoluta (hooks y backfill). */
export async function ingestRawDocumentFile(
  absPath: string,
  options: { model?: GenerativeModel; force?: boolean } = {},
): Promise<SourceIngestSummary> {
  const source = await readFile(absPath, "utf-8");
  const relativePath = path
    .relative(process.cwd(), absPath)
    .split(path.sep)
    .join("/");

  const fields = parseFrontmatter(source);
  const title = fields.title || path.basename(absPath).replace(/\.md$/, "");
  const body = stripFrontmatter(source);

  const outcome = await ingestDocumentSource({
    sourceType: "raw_document",
    sourceId: relativePath,
    documentPath: relativePath,
    title,
    documentMeta: {
      campo: fields.field || fields.campo,
      sourceType: fields.source_type,
      estado: fields.estado,
    },
    body,
    sourceMetadata: { campoSlug: fields.field },
    model: options.model,
    force: options.force,
  });

  return {
    sourceId: relativePath,
    title,
    skipped: outcome.skipped,
    nodes: outcome.result?.nodeIds.length ?? 0,
    edges: outcome.result?.edgeIds.length ?? 0,
    mentions: outcome.result?.mentionIds.length ?? 0,
  };
}

/** Ingesta los documentos crudos (pending + completed) al grafo. */
export async function ingestRawDocuments(options: {
  model?: GenerativeModel;
  force?: boolean;
} = {}): Promise<SourceIngestSummary[]> {
  const summaries: SourceIngestSummary[] = [];

  for (const dir of RAW_DOCUMENT_DIRS) {
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      summaries.push(
        await ingestRawDocumentFile(path.join(dir, file), options),
      );
    }
  }

  return summaries;
}
