import "server-only";

import { notebookDir, pageImageUrl } from "@/lib/cuadernos/paths";
import type {
  NotebookDetail,
  NotebookKind,
  NotebookMetatag,
  NotebookPageDto,
  NotebookPageStatus,
  NotebookSummary,
  PageAnalysis,
  PageEnrichment,
  PageMetatag,
  Quanta,
  StructuralVector,
} from "@/lib/cuadernos/types";
import { linkNotebookAuthor } from "@/lib/cuadernos/kg-link";
import { prisma } from "@/lib/prisma";
import { getDataRoot } from "@/lib/runtime-paths";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const IMAGE_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return base || "pagina";
}

function resolveMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mime = IMAGE_EXTENSIONS[ext];
  if (!mime) {
    throw new Error("Formato no soportado. Usá .png o .jpg.");
  }
  return mime;
}

function toRelativeDataPath(absolutePath: string): string {
  const dataRoot = getDataRoot();
  const relative = path.relative(dataRoot, absolutePath);
  return path.join("data", relative).replace(/\\/g, "/");
}

function parsePageMetatags(value: unknown): PageMetatag[] {
  if (!Array.isArray(value)) return [];
  return value as PageMetatag[];
}

function parseEnrichments(value: unknown): PageEnrichment[] {
  if (!Array.isArray(value)) return [];
  return value as PageEnrichment[];
}

function parseNotebookMetatags(value: unknown): NotebookMetatag[] {
  if (!Array.isArray(value)) return [];
  return value as NotebookMetatag[];
}

function structuralVectorToNotes(structural: StructuralVector | null): string {
  if (!structural) return "";
  const parts: string[] = [];
  if (structural.tags.length) parts.push(`Tags: ${structural.tags.join(", ")}`);
  if (structural.projects.length) {
    parts.push(`Proyectos: ${structural.projects.join(", ")}`);
  }
  if (structural.spatialMap?.description) {
    parts.push(`Mapa espacial: ${structural.spatialMap.description}`);
  }
  if (structural.visualRelations.length) {
    parts.push(
      "Relaciones visuales: " +
        structural.visualRelations
          .map((r) => `${r.from} → ${r.relation} → ${r.to}`)
          .join("; "),
    );
  }
  if (structural.rawNotes) parts.push(structural.rawNotes);
  return parts.join("\n");
}

function tagsToPageMetatags(tags: string[]): PageMetatag[] {
  return tags.map((tag, index) => ({
    id: `vision-${index}-${tag.slice(0, 12).replace(/\s+/g, "-")}`,
    label: tag,
    source: "vision" as const,
  }));
}

async function resolveAuthorNames(
  personaIds: string[],
): Promise<Map<string, string>> {
  if (personaIds.length === 0) return new Map();
  const nodes = await prisma.kgNode.findMany({
    where: { id: { in: personaIds }, type: "persona" },
    select: { id: true, primaryName: true },
  });
  return new Map(nodes.map((node) => [node.id, node.primaryName]));
}

function mapPage(page: {
  id: string;
  notebookId: string;
  pageNumber: number;
  filename: string;
  imagePath: string;
  mimeType: string;
  status: string;
  semanticVector: string | null;
  structuralVector: unknown;
  quanta: unknown;
  pageMetatags: unknown;
  enrichments: unknown;
  processedAt: Date | null;
  corpusCaptureId: string | null;
  createdAt: Date;
}): NotebookPageDto {
  const structural =
    (page.structuralVector as StructuralVector | null) ?? null;

  return {
    id: page.id,
    notebookId: page.notebookId,
    pageNumber: page.pageNumber,
    filename: page.filename,
    imageUrl: pageImageUrl(page.imagePath),
    mimeType: page.mimeType,
    status: page.status as NotebookPageStatus,
    semanticVector: page.semanticVector,
    structuralVector: structural,
    quanta: (page.quanta as Quanta[] | null) ?? null,
    pageAnalysis: structural?.analysis ?? null,
    pageMetatags: parsePageMetatags(page.pageMetatags),
    enrichments: parseEnrichments(page.enrichments),
    processedAt: page.processedAt?.toISOString() ?? null,
    corpusCaptureId: page.corpusCaptureId,
    createdAt: page.createdAt.toISOString(),
  };
}

async function mapNotebookSummary(notebook: {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  authorPersonaId: string | null;
  coverHue: number;
  createdAt: Date;
  updatedAt: Date;
  pages: Array<{ id: string; status: string; pageNumber: number }>;
}): Promise<NotebookSummary> {
  const authorNames = await resolveAuthorNames(
    notebook.authorPersonaId ? [notebook.authorPersonaId] : [],
  );
  const coverPage = notebook.pages[0] ?? null;

  return {
    id: notebook.id,
    title: notebook.title,
    description: notebook.description,
    kind: (notebook.kind as NotebookKind) ?? "cuaderno",
    authorPersonaId: notebook.authorPersonaId,
    authorName: notebook.authorPersonaId
      ? (authorNames.get(notebook.authorPersonaId) ?? null)
      : null,
    coverHue: notebook.coverHue,
    pageCount: notebook.pages.length,
    processedCount: notebook.pages.filter((p) => p.status === "COMPLETED").length,
    coverPageId: coverPage?.id ?? null,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
  };
}

export async function listNotebooks(): Promise<NotebookSummary[]> {
  const notebooks = await prisma.notebook.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      pages: {
        select: { id: true, status: true, pageNumber: true },
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  return Promise.all(notebooks.map((notebook) => mapNotebookSummary(notebook)));
}

export async function getNotebookById(id: string): Promise<NotebookDetail | null> {
  const notebook = await prisma.notebook.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
    },
  });

  if (!notebook) return null;

  const summary = await mapNotebookSummary(notebook);

  return {
    ...summary,
    metatags: parseNotebookMetatags(notebook.metatags),
    pages: notebook.pages.map(mapPage),
  };
}

export async function createNotebook(input: {
  title: string;
  description?: string;
}): Promise<NotebookSummary> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("El título del cuaderno es obligatorio.");
  }

  const coverHue = Math.floor(Math.random() * 360);

  const notebook = await prisma.notebook.create({
    data: {
      title,
      description: input.description?.trim() || null,
      coverHue,
    },
  });

  await mkdir(notebookDir(notebook.id), { recursive: true });

  return {
    id: notebook.id,
    title: notebook.title,
    description: notebook.description,
    coverHue: notebook.coverHue,
    kind: notebook.kind as NotebookKind,
    authorPersonaId: notebook.authorPersonaId,
    authorName: null,
    pageCount: 0,
    processedCount: 0,
    coverPageId: null,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
  };
}

export async function addNotebookPage(
  notebookId: string,
  buffer: Buffer,
  originalFilename: string,
): Promise<NotebookPageDto> {
  const notebook = await prisma.notebook.findUnique({ where: { id: notebookId } });
  if (!notebook) {
    throw new Error("Cuaderno no encontrado.");
  }

  const mimeType = resolveMimeType(originalFilename);
  const lastPage = await prisma.notebookPage.findFirst({
    where: { notebookId },
    orderBy: { pageNumber: "desc" },
    select: { pageNumber: true },
  });
  const pageNumber = (lastPage?.pageNumber ?? 0) + 1;

  const safeName = sanitizeFilename(originalFilename);
  const storedName = `${String(pageNumber).padStart(3, "0")}_${randomUUID().slice(0, 8)}_${safeName}`;
  const absolutePath = path.join(notebookDir(notebookId), storedName);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  const imagePath = toRelativeDataPath(absolutePath);

  const page = await prisma.notebookPage.create({
    data: {
      notebookId,
      pageNumber,
      filename: originalFilename,
      imagePath,
      mimeType,
      status: "PENDING",
    },
  });

  await prisma.notebook.update({
    where: { id: notebookId },
    data: { updatedAt: new Date() },
  });

  return mapPage(page);
}

export async function markPageProcessing(pageId: string): Promise<void> {
  await prisma.notebookPage.update({
    where: { id: pageId },
    data: { status: "PROCESSING" },
  });
}

export async function savePageVisionResult(
  pageId: string,
  result: {
    semanticVector: string;
    structuralVector: StructuralVector;
    quanta: Quanta[];
    pageAnalysis?: PageAnalysis;
    corpusCaptureId?: string;
  },
): Promise<NotebookPageDto> {
  const structuralVector: StructuralVector = {
    ...result.structuralVector,
    ...(result.pageAnalysis
      ? { analysis: result.pageAnalysis }
      : result.structuralVector.analysis
        ? { analysis: result.structuralVector.analysis }
        : {}),
  };

  const page = await prisma.notebookPage.update({
    where: { id: pageId },
    data: {
      status: "COMPLETED",
      semanticVector: result.semanticVector,
      structuralVector,
      quanta: result.quanta,
      processedAt: new Date(),
      corpusCaptureId: result.corpusCaptureId ?? null,
      pageMetatags: tagsToPageMetatags(
        result.pageAnalysis?.semanticTags ?? structuralVector.tags,
      ),
    },
  });

  await prisma.notebook.update({
    where: { id: page.notebookId },
    data: { updatedAt: new Date() },
  });

  return mapPage(page);
}

export async function updatePageAnalysis(
  pageId: string,
  analysis: PageAnalysis,
): Promise<NotebookPageDto> {
  const existing = await prisma.notebookPage.findUnique({ where: { id: pageId } });
  if (!existing) {
    throw new Error("Página no encontrada.");
  }

  const structural =
    (existing.structuralVector as StructuralVector | null) ?? {
      tags: [],
      projects: [],
      hasDiagram: false,
      hasSymbols: false,
      hasArrows: false,
      hasRunes: false,
      hasGeometry: false,
      visualRelations: [],
    };

  const nextStructural: StructuralVector = {
    ...structural,
    tags: analysis.semanticTags.length ? analysis.semanticTags : structural.tags,
    analysis,
  };

  const page = await prisma.notebookPage.update({
    where: { id: pageId },
    data: {
      structuralVector: nextStructural,
      pageMetatags: tagsToPageMetatags(analysis.semanticTags),
    },
  });

  return mapPage(page);
}

export async function markPageError(pageId: string): Promise<void> {
  await prisma.notebookPage.update({
    where: { id: pageId },
    data: { status: "ERROR" },
  });
}

export async function getPageById(pageId: string) {
  return prisma.notebookPage.findUnique({ where: { id: pageId } });
}

export async function resolvePageImagePath(pageId: string): Promise<string | null> {
  const page = await getPageById(pageId);
  if (!page) return null;

  const normalized = page.imagePath.replace(/^data[\\/]/, "");
  return path.join(getDataRoot(), normalized.replace(/^data[\\/]/, ""));
}
