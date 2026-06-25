import "server-only";

import { notebookDir, pageImageUrl } from "@/lib/cuadernos/paths";
import type {
  NotebookDetail,
  NotebookPageDto,
  NotebookPageStatus,
  NotebookSummary,
  Quanta,
  StructuralVector,
} from "@/lib/cuadernos/types";
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
  processedAt: Date | null;
  corpusCaptureId: string | null;
  createdAt: Date;
}): NotebookPageDto {
  return {
    id: page.id,
    notebookId: page.notebookId,
    pageNumber: page.pageNumber,
    filename: page.filename,
    imageUrl: pageImageUrl(page.imagePath),
    mimeType: page.mimeType,
    status: page.status as NotebookPageStatus,
    semanticVector: page.semanticVector,
    structuralVector: (page.structuralVector as StructuralVector | null) ?? null,
    quanta: (page.quanta as Quanta[] | null) ?? null,
    processedAt: page.processedAt?.toISOString() ?? null,
    corpusCaptureId: page.corpusCaptureId,
    createdAt: page.createdAt.toISOString(),
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

  return notebooks.map((notebook) => {
    const coverPage = notebook.pages[0] ?? null;
    return {
      id: notebook.id,
      title: notebook.title,
      description: notebook.description,
      coverHue: notebook.coverHue,
      pageCount: notebook.pages.length,
      processedCount: notebook.pages.filter((p) => p.status === "COMPLETED").length,
      coverPageId: coverPage?.id ?? null,
      createdAt: notebook.createdAt.toISOString(),
      updatedAt: notebook.updatedAt.toISOString(),
    };
  });
}

export async function getNotebookById(id: string): Promise<NotebookDetail | null> {
  const notebook = await prisma.notebook.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
    },
  });

  if (!notebook) return null;

  const coverPage = notebook.pages[0] ?? null;

  return {
    id: notebook.id,
    title: notebook.title,
    description: notebook.description,
    coverHue: notebook.coverHue,
    pageCount: notebook.pages.length,
    processedCount: notebook.pages.filter((p) => p.status === "COMPLETED").length,
    coverPageId: coverPage?.id ?? null,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
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
    corpusCaptureId?: string;
  },
): Promise<NotebookPageDto> {
  const page = await prisma.notebookPage.update({
    where: { id: pageId },
    data: {
      status: "COMPLETED",
      semanticVector: result.semanticVector,
      structuralVector: result.structuralVector,
      quanta: result.quanta,
      processedAt: new Date(),
      corpusCaptureId: result.corpusCaptureId ?? null,
    },
  });

  await prisma.notebook.update({
    where: { id: page.notebookId },
    data: { updatedAt: new Date() },
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
