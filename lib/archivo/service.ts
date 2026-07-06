import "server-only";

import {
  buildArchivoId,
  type ArchivoItemDetail,
  type ArchivoItemSummary,
  type ArchivoKind,
  type ArchivoListResult,
  type ArchivoSearchHit,
  parseArchivoId,
} from "@/lib/archivo/types";
import {
  pickAreaTag,
  resolveStrongestTag,
  tagFromBaseWeight,
  tagFromCampo,
  tagFromOnda,
  tagFromPrioridad,
  tagFromStringList,
} from "@/lib/archivo/strongest-tag";
import type { StructuralVector } from "@/lib/cuadernos/types";
import { parseJournalFile } from "@/lib/journal/markdown";
import { JOURNAL_ROOT } from "@/lib/journal/paths";
import { getDocumentMeta } from "@/lib/meta-meteador/store";
import { listProjects } from "@/lib/projects/service";
import type { PurifierReviewRecord } from "@/lib/purifier/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getDataRoot, getRawDocumentsPath, resolveDataRelativePath } from "@/lib/runtime-paths";
import { namesMatchFuzzy, normalizeName } from "@/lib/kg/normalize";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const RAW_DOCUMENT_SUBDIRS = [
  "pending",
  "completed",
  "pending_purification",
] as const;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

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

function previewFromContent(content: string, max = 220): string {
  return truncate(content.replace(/\s+/g, " "), max);
}

function parseBaseWeight(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

async function metaStrongestTag(documentId: string) {
  const meta = await getDocumentMeta(documentId);
  if (!meta) return null;
  return resolveStrongestTag([
    pickAreaTag(meta.areas),
    tagFromCampo(meta.campo, 8),
    tagFromCampo(meta.particula, 7),
    tagFromCampo(meta.materia, 6),
  ]);
}

async function collectRawDocuments(): Promise<ArchivoItemSummary[]> {
  const items: ArchivoItemSummary[] = [];

  for (const subdir of RAW_DOCUMENT_SUBDIRS) {
    const dir = getRawDocumentsPath(subdir);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }

    for (const filename of files) {
      if (!filename.endsWith(".md")) continue;

      const absPath = path.join(dir, filename);
      const relativePath = path.posix.join("raw_documents", subdir, filename);
      let source: string;
      try {
        source = await readFile(absPath, "utf-8");
      } catch {
        continue;
      }

      const fields = parseFrontmatter(source);
      const body = stripFrontmatter(source);
      if (!body.trim()) continue;

      const title = fields.title || filename.replace(/\.md$/, "");
      const createdAt = fields.created_at || new Date().toISOString();
      const baseWeight = parseBaseWeight(fields.base_weight);
      const documentId = fields.id || relativePath;

      items.push({
        id: buildArchivoId("raw_document", relativePath),
        kind: "raw_document",
        sourceId: relativePath,
        title,
        preview: previewFromContent(body),
        charCount: body.length,
        createdAt,
        updatedAt: null,
        fuenteOrigen: fields.source_type || `raw-${subdir}`,
        strongestTag: resolveStrongestTag([
          tagFromBaseWeight(fields.campo || fields.field || "Sin campo", baseWeight),
          tagFromCampo(fields.onda, 5),
          await metaStrongestTag(documentId),
        ]),
        meta: {
          subdir,
          estado: fields.estado ?? null,
          field: fields.field ?? null,
          onda: fields.onda ?? null,
        },
      });
    }
  }

  return items;
}

async function collectAudioTranscripts(): Promise<ArchivoItemSummary[]> {
  const assets = await prisma.audioAsset.findMany({
    where: { transcript: { isNot: null } },
    orderBy: { createdAt: "desc" },
    include: {
      transcript: { select: { rawText: true, createdAt: true } },
    },
  });

  return assets
    .filter((asset) => asset.transcript?.rawText.trim())
    .map((asset) => {
      const rawText = asset.transcript!.rawText;
      return {
        id: buildArchivoId("audio_transcript", asset.id),
        kind: "audio_transcript" as const,
        sourceId: asset.id,
        title: asset.filename.replace(/\.[^.]+$/, ""),
        preview: previewFromContent(rawText),
        charCount: rawText.length,
        createdAt: (
          asset.originalCreatedAt ?? asset.transcript!.createdAt
        ).toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
        fuenteOrigen: "audio-stt",
        strongestTag: tagFromCampo("Transcripción", 7),
        meta: {
          status: asset.status,
          durationMs: asset.durationMs ? String(asset.durationMs) : null,
        },
      };
    });
}

async function collectJournalEntries(): Promise<ArchivoItemSummary[]> {
  let monthDirs: string[];
  try {
    monthDirs = await readdir(JOURNAL_ROOT);
  } catch {
    return [];
  }

  const items: ArchivoItemSummary[] = [];

  for (const monthDirName of monthDirs) {
    const monthDir = path.join(JOURNAL_ROOT, monthDirName);
    let files: string[];
    try {
      files = await readdir(monthDir);
    } catch {
      continue;
    }

    for (const filename of files) {
      if (!filename.endsWith(".md")) continue;

      const filePath = path.join(monthDir, filename);
      const relativePath = path.posix.join("journal", monthDirName, filename);
      let source: string;
      try {
        source = await readFile(filePath, "utf-8");
      } catch {
        continue;
      }

      const parsed = parseJournalFile(source, relativePath);
      if (!parsed || !parsed.body.trim()) continue;

      items.push({
        id: buildArchivoId("journal", relativePath),
        kind: "journal",
        sourceId: relativePath,
        title: parsed.title,
        preview: previewFromContent(parsed.body),
        charCount: parsed.body.length,
        createdAt: parsed.fechaRegistro,
        updatedAt: null,
        fuenteOrigen: `diario-${parsed.onda.toLowerCase()}`,
        strongestTag: resolveStrongestTag([
          tagFromOnda(parsed.onda),
          tagFromCampo(parsed.campo, 6),
        ]),
        meta: {
          onda: parsed.onda,
          month: monthDirName,
        },
      });
    }
  }

  return items;
}

async function collectCuadernoPages(): Promise<ArchivoItemSummary[]> {
  const pages = await prisma.notebookPage.findMany({
    where: {
      OR: [
        { semanticVector: { not: null } },
        { quanta: { not: Prisma.DbNull } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: { notebook: { select: { id: true, title: true } } },
  });

  return pages
    .map((page) => {
      const quanta = (page.quanta as Array<{ text: string }> | null) ?? [];
      const text =
        page.semanticVector?.trim() ||
        quanta.map((item) => item.text).join("\n").trim();
      if (!text) return null;

      const structural = (page.structuralVector as StructuralVector | null) ?? null;

      return {
        id: buildArchivoId("cuaderno_page", page.id),
        kind: "cuaderno_page" as const,
        sourceId: page.id,
        title: `${page.notebook.title} · pág. ${page.pageNumber}`,
        preview: previewFromContent(text),
        charCount: text.length,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
        fuenteOrigen: "cuaderno-ocr",
        strongestTag: resolveStrongestTag([
          tagFromStringList(structural?.projects ?? [], 8),
          tagFromStringList(structural?.tags ?? [], 6),
          tagFromCampo(page.notebook.title, 5),
        ]),
        meta: {
          notebookId: page.notebook.id,
          notebookTitle: page.notebook.title,
          pageNumber: String(page.pageNumber),
          status: page.status,
        },
      } satisfies ArchivoItemSummary;
    })
    .filter((item): item is ArchivoItemSummary => item !== null);
}

async function collectProjects(): Promise<ArchivoItemSummary[]> {
  const projects = await listProjects();

  return projects
    .map((project) => {
      const progressText = project.progressEntries
        .map((entry) => `[${entry.fecha}] ${entry.nota}`)
        .join("\n");
      const content = [project.description, progressText]
        .filter(Boolean)
        .join("\n\n")
        .trim();
      if (!content) return null;

      return {
        id: buildArchivoId("project", project.id),
        kind: "project" as const,
        sourceId: project.id,
        title: project.title,
        preview: previewFromContent(content),
        charCount: content.length,
        createdAt: project.fechaInicio || new Date().toISOString(),
        updatedAt: null,
        fuenteOrigen: "proyecto-markdown",
        strongestTag: resolveStrongestTag([
          tagFromPrioridad(project.campo, project.prioridad, project.impacto),
          tagFromStringList(project.metaTagsSecundarios, 6),
        ]),
        meta: {
          campoSlug: project.campoSlug,
          estado: project.estado,
          filename: project.filename,
        },
      } satisfies ArchivoItemSummary;
    })
    .filter((item): item is ArchivoItemSummary => item !== null);
}

async function collectPurifierReviews(): Promise<ArchivoItemSummary[]> {
  const rows = await prisma.purifierReview.findMany({
    orderBy: { processedAt: "desc" },
  });

  return rows
    .map((row) => {
      const record = row.payload as PurifierReviewRecord;
      const content =
        record.originalText?.trim() ||
        record.cleanedText?.trim() ||
        record.normalizedMarkdown?.trim() ||
        "";
      if (!content) return null;

      const gravity = record.gravity;

      return {
        id: buildArchivoId("purifier_review", record.reviewId),
        kind: "purifier_review" as const,
        sourceId: record.reviewId,
        title: row.title || record.particula,
        preview: previewFromContent(content),
        charCount: content.length,
        createdAt: row.processedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        fuenteOrigen: "purifier-hitl",
        strongestTag: resolveStrongestTag([
          tagFromPrioridad(
            gravity.campoSlug ?? record.particula,
            gravity.prioridad ?? 0,
            gravity.impacto ?? 0,
          ),
          tagFromStringList(record.metaTagsSecundarios ?? [], 5),
        ]),
        meta: {
          assetId: record.assetId ?? null,
          particula: record.particula,
        },
      } satisfies ArchivoItemSummary;
    })
    .filter((item): item is ArchivoItemSummary => item !== null);
}

let cachedItems: ArchivoItemSummary[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15_000;

async function loadAllSummaries(force = false): Promise<ArchivoItemSummary[]> {
  const now = Date.now();
  if (!force && cachedItems && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedItems;
  }

  const [raw, audio, journal, cuadernos, projects, purifier] = await Promise.all([
    collectRawDocuments(),
    collectAudioTranscripts(),
    collectJournalEntries(),
    collectCuadernoPages(),
    collectProjects(),
    collectPurifierReviews(),
  ]);

  cachedItems = [...raw, ...audio, ...journal, ...cuadernos, ...projects, ...purifier].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  cacheTimestamp = now;
  return cachedItems;
}

function countByKind(items: ArchivoItemSummary[]): Record<ArchivoKind, number> {
  const counts = {
    raw_document: 0,
    audio_transcript: 0,
    journal: 0,
    cuaderno_page: 0,
    project: 0,
    purifier_review: 0,
  } satisfies Record<ArchivoKind, number>;

  for (const item of items) {
    counts[item.kind] += 1;
  }
  return counts;
}

export async function listArchivoItems(options?: {
  kind?: ArchivoKind;
  force?: boolean;
}): Promise<ArchivoListResult> {
  let items = await loadAllSummaries(options?.force);
  if (options?.kind) {
    items = items.filter((item) => item.kind === options.kind);
  }

  return {
    items,
    total: items.length,
    byKind: countByKind(items),
  };
}

export async function getArchivoItem(id: string): Promise<ArchivoItemDetail | null> {
  const parsed = parseArchivoId(id);
  if (!parsed) return null;

  const summaries = await loadAllSummaries();
  const summary = summaries.find((item) => item.id === id);
  if (!summary) return null;

  const content = await loadArchivoContent(parsed.kind, parsed.sourceId);
  if (!content) return null;

  return {
    ...summary,
    content,
    deepLink: resolveDeepLink(parsed.kind, parsed.sourceId, summary.meta),
  };
}

async function loadArchivoContent(
  kind: ArchivoKind,
  sourceId: string,
): Promise<string | null> {
  switch (kind) {
    case "raw_document": {
      const absPath = resolveDataRelativePath(sourceId);
      try {
        const source = await readFile(absPath, "utf-8");
        return stripFrontmatter(source);
      } catch {
        return null;
      }
    }
    case "audio_transcript": {
      const asset = await prisma.audioAsset.findUnique({
        where: { id: sourceId },
        include: { transcript: { select: { rawText: true } } },
      });
      return asset?.transcript?.rawText ?? null;
    }
    case "journal": {
      const absPath = path.join(getDataRoot(), sourceId);
      try {
        const source = await readFile(absPath, "utf-8");
        const parsed = parseJournalFile(source, sourceId);
        return parsed?.body ?? null;
      } catch {
        return null;
      }
    }
    case "cuaderno_page": {
      const page = await prisma.notebookPage.findUnique({
        where: { id: sourceId },
      });
      if (!page) return null;
      const quanta = (page.quanta as Array<{ text: string }> | null) ?? [];
      return (
        page.semanticVector?.trim() ||
        quanta.map((item) => item.text).join("\n").trim() ||
        null
      );
    }
    case "project": {
      const projects = await listProjects();
      const project = projects.find((item) => item.id === sourceId);
      if (!project) return null;
      const progressText = project.progressEntries
        .map((entry) => `[${entry.fecha}] ${entry.nota}`)
        .join("\n");
      return [project.description, progressText].filter(Boolean).join("\n\n").trim() || null;
    }
    case "purifier_review": {
      const row = await prisma.purifierReview.findUnique({
        where: { reviewId: sourceId },
      });
      if (!row) return null;
      const record = row.payload as PurifierReviewRecord;
      return (
        record.originalText?.trim() ||
        record.cleanedText?.trim() ||
        record.normalizedMarkdown?.trim() ||
        null
      );
    }
    default:
      return null;
  }
}

function resolveDeepLink(
  kind: ArchivoKind,
  sourceId: string,
  meta: Record<string, string | null>,
): string | null {
  switch (kind) {
    case "audio_transcript":
      return `/audio/${sourceId}`;
    case "journal":
      return "/diario";
    case "cuaderno_page":
      return meta.notebookId
        ? `/ingesta/cuadernos/${meta.notebookId}`
        : "/ingesta/cuadernos";
    case "project":
      return meta.campoSlug
        ? `/proyectos?highlight=${sourceId}`
        : "/proyectos";
    case "purifier_review":
      return `/validar?review=${sourceId}`;
    case "raw_document":
      return "/ingesta";
    default:
      return null;
  }
}

function tokenize(query: string): string[] {
  return normalizeName(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreArchivoText(text: string, query: string, tokens: string[]): number {
  const normalized = normalizeName(text);
  if (!normalized) return 0;
  if (namesMatchFuzzy(text, query)) return 12;

  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) score += 4;
  }
  return score;
}

export async function searchArchivo(
  query: string,
  options?: { limit?: number; kind?: ArchivoKind },
): Promise<ArchivoSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = tokenize(trimmed);
  const limit = options?.limit ?? 24;
  let items = await loadAllSummaries();

  if (options?.kind) {
    items = items.filter((item) => item.kind === options.kind);
  }

  const hits: ArchivoSearchHit[] = [];

  for (const item of items) {
    const titleScore = scoreArchivoText(item.title, trimmed, tokens) * 2;
    const previewScore = scoreArchivoText(item.preview, trimmed, tokens);
    const tagScore = item.strongestTag
      ? scoreArchivoText(item.strongestTag.label, trimmed, tokens)
      : 0;

    let score = titleScore + previewScore + tagScore;
    if (score <= 0) continue;

    let snippet = item.preview;
    if (score < 8) {
      const content = await loadArchivoContent(item.kind, item.sourceId);
      if (content) {
        const bodyScore = scoreArchivoText(content, trimmed, tokens);
        if (bodyScore > 0) {
          score += bodyScore;
          snippet = previewFromContent(content, 280);
        } else if (score <= 0) {
          continue;
        }
      }
    }

    hits.push({ ...item, score, snippet });
  }

  return hits
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit);
}

export function invalidateArchivoCache(): void {
  cachedItems = null;
  cacheTimestamp = 0;
}
