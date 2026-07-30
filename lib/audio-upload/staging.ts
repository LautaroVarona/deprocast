import "server-only";

import {
  assembleChunksFromBlob,
  assertBlobTokenConfigured,
  cleanupBlobStaging,
  listReceivedChunksFromBlob,
  readMetaFromBlob,
  writeChunkToBlob,
  writeMetaToBlob,
} from "@/lib/audio-upload/blob-staging";
import { prisma } from "@/lib/prisma";
import {
  getUploadDir,
  getUploadStagingDir,
  isVercelRuntime,
} from "@/lib/runtime-paths";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import path from "path";

export type ChunkUploadMeta = {
  uploadId: string;
  assetId: string;
  filename: string;
  extension: string;
  totalChunks: number;
  ambientContext: string;
  received: number[];
};

function parseReceived(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function rowToMeta(row: {
  id: string;
  assetId: string;
  filename: string;
  extension: string;
  totalChunks: number;
  ambientContext: string;
  receivedJson: string;
}): ChunkUploadMeta {
  return {
    uploadId: row.id,
    assetId: row.assetId,
    filename: row.filename,
    extension: row.extension,
    totalChunks: row.totalChunks,
    ambientContext: row.ambientContext,
    received: parseReceived(row.receivedJson),
  };
}

/** Copia estable para Prisma Bytes (evita Buffer/ArrayBufferLike vs Uint8Array<ArrayBuffer>). */
function toPrismaBytes(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy;
}

/** Preferir Blob en Vercel (multi-instancia). Local: Prisma + espejo FS. */
export async function writeMeta(meta: ChunkUploadMeta): Promise<void> {
  if (isVercelRuntime()) {
    assertBlobTokenConfigured();
    await writeMetaToBlob(meta);
    return;
  }

  await prisma.audioUploadSession.upsert({
    where: { id: meta.uploadId },
    create: {
      id: meta.uploadId,
      assetId: meta.assetId,
      filename: meta.filename,
      extension: meta.extension,
      totalChunks: meta.totalChunks,
      ambientContext: meta.ambientContext,
      receivedJson: JSON.stringify(meta.received),
    },
    update: {
      assetId: meta.assetId,
      filename: meta.filename,
      extension: meta.extension,
      totalChunks: meta.totalChunks,
      ambientContext: meta.ambientContext,
      receivedJson: JSON.stringify(meta.received),
    },
  });

  try {
    const dir = getUploadStagingDir(meta.uploadId);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "meta.json"),
      JSON.stringify(meta),
      "utf8",
    );
  } catch {
    /* espejo local no crítico */
  }
}

export async function readMeta(
  uploadId: string,
): Promise<ChunkUploadMeta | null> {
  if (isVercelRuntime()) {
    return readMetaFromBlob(uploadId);
  }

  try {
    const row = await prisma.audioUploadSession.findUnique({
      where: { id: uploadId },
    });
    if (row) return rowToMeta(row);
  } catch (error) {
    console.warn("readMeta Prisma failed, fallback FS:", error);
  }

  try {
    const raw = await readFile(
      path.join(getUploadStagingDir(uploadId), "meta.json"),
      "utf8",
    );
    return JSON.parse(raw) as ChunkUploadMeta;
  } catch {
    return null;
  }
}

export async function writeChunk(
  uploadId: string,
  index: number,
  buffer: Buffer,
): Promise<void> {
  if (isVercelRuntime()) {
    assertBlobTokenConfigured();
    await writeChunkToBlob(uploadId, index, buffer);
    // Actualizar received en meta Blob
    const meta = await readMetaFromBlob(uploadId);
    if (meta && !meta.received.includes(index)) {
      meta.received.push(index);
      meta.received.sort((a, b) => a - b);
      await writeMetaToBlob(meta);
    }
    return;
  }

  const data = toPrismaBytes(buffer);

  await prisma.$transaction(async (tx) => {
    await tx.audioUploadChunk.upsert({
      where: {
        uploadId_chunkIndex: { uploadId, chunkIndex: index },
      },
      create: {
        uploadId,
        chunkIndex: index,
        data,
      },
      update: {
        data,
      },
    });

    const session = await tx.audioUploadSession.findUnique({
      where: { id: uploadId },
      select: { receivedJson: true },
    });
    if (session) {
      const received = new Set(parseReceived(session.receivedJson));
      received.add(index);
      await tx.audioUploadSession.update({
        where: { id: uploadId },
        data: {
          receivedJson: JSON.stringify([...received].sort((a, b) => a - b)),
        },
      });
    }
  });

  try {
    const dir = getUploadStagingDir(uploadId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `chunk-${index}.part`), buffer);
  } catch {
    /* espejo local no crítico */
  }
}

export async function assembleChunks(
  uploadId: string,
  totalChunks: number,
): Promise<Buffer> {
  if (isVercelRuntime()) {
    return assembleChunksFromBlob(uploadId, totalChunks);
  }

  const rows = await prisma.audioUploadChunk.findMany({
    where: { uploadId },
    orderBy: { chunkIndex: "asc" },
    select: { chunkIndex: true, data: true },
  });

  if (rows.length >= totalChunks) {
    const byIndex = new Map(
      rows.map((r) => [r.chunkIndex, Buffer.from(r.data)]),
    );
    const parts: Buffer[] = [];
    for (let i = 0; i < totalChunks; i += 1) {
      const part = byIndex.get(i);
      if (!part) {
        throw new Error(`Falta chunk ${i} en staging Prisma.`);
      }
      parts.push(part);
    }
    return Buffer.concat(parts);
  }

  const parts: Buffer[] = [];
  for (let i = 0; i < totalChunks; i += 1) {
    parts.push(
      await readFile(
        path.join(getUploadStagingDir(uploadId), `chunk-${i}.part`),
      ),
    );
  }
  return Buffer.concat(parts);
}

export async function writeFinalAudio(
  storedFilename: string,
  buffer: Buffer,
): Promise<string> {
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, storedFilename);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function cleanupStaging(uploadId: string): Promise<void> {
  if (isVercelRuntime()) {
    await cleanupBlobStaging(uploadId).catch(() => undefined);
    return;
  }

  await prisma.audioUploadSession
    .delete({ where: { id: uploadId } })
    .catch(() => undefined);

  const dir = getUploadStagingDir(uploadId);
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

export async function listReceivedChunks(uploadId: string): Promise<number[]> {
  if (isVercelRuntime()) {
    return listReceivedChunksFromBlob(uploadId);
  }

  try {
    const rows = await prisma.audioUploadChunk.findMany({
      where: { uploadId },
      select: { chunkIndex: true },
      orderBy: { chunkIndex: "asc" },
    });
    if (rows.length > 0) return rows.map((r) => r.chunkIndex);
  } catch {
    /* fallback */
  }

  const dir = getUploadStagingDir(uploadId);
  try {
    const files = await readdir(dir);
    return files
      .map((name) => {
        const match = /^chunk-(\d+)\.part$/.exec(name);
        return match ? Number(match[1]) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** @deprecated path helpers — staging durable es Prisma/Blob */
export async function ensureStagingDir(uploadId: string): Promise<string> {
  const dir = getUploadStagingDir(uploadId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function metaPath(uploadId: string): string {
  return path.join(getUploadStagingDir(uploadId), "meta.json");
}

export function chunkPath(uploadId: string, index: number): string {
  return path.join(getUploadStagingDir(uploadId), `chunk-${index}.part`);
}
