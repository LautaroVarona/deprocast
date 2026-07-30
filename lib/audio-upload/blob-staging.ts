import "server-only";

import { del, get, list, put } from "@vercel/blob";

/** Mirror de ChunkUploadMeta — evita ciclo con staging.ts */
export type BlobChunkUploadMeta = {
  uploadId: string;
  assetId: string;
  filename: string;
  extension: string;
  totalChunks: number;
  ambientContext: string;
  received: number[];
};

const PREFIX = "audio-upload";

export function blobMetaPath(uploadId: string): string {
  return `${PREFIX}/${uploadId}/meta.json`;
}

export function blobChunkPath(uploadId: string, index: number): string {
  return `${PREFIX}/${uploadId}/${index}.part`;
}

export function blobUploadPrefix(uploadId: string): string {
  return `${PREFIX}/${uploadId}/`;
}

export function assertBlobTokenConfigured(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN no configurado. En Vercel es obligatorio para audio >3.5MB (staging compartido entre instancias).",
    );
  }
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

async function putBytes(
  pathname: string,
  body: Buffer | string,
  contentType: string,
): Promise<void> {
  assertBlobTokenConfigured();
  await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
}

async function readBlobBytes(pathnameOrUrl: string): Promise<Buffer> {
  assertBlobTokenConfigured();
  const result = await get(pathnameOrUrl, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Blob get vacío para ${pathnameOrUrl}`);
  }
  return streamToBuffer(result.stream);
}

export async function writeMetaToBlob(meta: BlobChunkUploadMeta): Promise<void> {
  await putBytes(
    blobMetaPath(meta.uploadId),
    JSON.stringify(meta),
    "application/json",
  );
}

export async function readMetaFromBlob(
  uploadId: string,
): Promise<BlobChunkUploadMeta | null> {
  try {
    assertBlobTokenConfigured();
  } catch {
    return null;
  }

  try {
    const raw = await readBlobBytes(blobMetaPath(uploadId));
    return JSON.parse(raw.toString("utf8")) as BlobChunkUploadMeta;
  } catch (error) {
    console.warn("readMetaFromBlob failed:", error);
    return null;
  }
}

export async function writeChunkToBlob(
  uploadId: string,
  index: number,
  buffer: Buffer,
): Promise<void> {
  await putBytes(
    blobChunkPath(uploadId, index),
    buffer,
    "application/octet-stream",
  );
}

export async function listReceivedChunksFromBlob(
  uploadId: string,
): Promise<number[]> {
  try {
    assertBlobTokenConfigured();
  } catch {
    return [];
  }

  const prefix = blobUploadPrefix(uploadId);
  const indices: number[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const name = blob.pathname.slice(prefix.length);
      const match = /^(\d+)\.part$/.exec(name);
      if (match) indices.push(Number(match[1]));
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return [...new Set(indices)].sort((a, b) => a - b);
}

export async function assembleChunksFromBlob(
  uploadId: string,
  totalChunks: number,
): Promise<Buffer> {
  assertBlobTokenConfigured();
  const prefix = blobUploadPrefix(uploadId);
  const byIndex = new Map<number, string>();
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const name = blob.pathname.slice(prefix.length);
      const match = /^(\d+)\.part$/.exec(name);
      if (match) byIndex.set(Number(match[1]), blob.pathname);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const parts: Buffer[] = [];
  for (let i = 0; i < totalChunks; i += 1) {
    const pathname = byIndex.get(i);
    if (!pathname) {
      throw new Error(`Falta chunk ${i} en staging Blob.`);
    }
    parts.push(await readBlobBytes(pathname));
  }

  return Buffer.concat(parts);
}

export async function cleanupBlobStaging(uploadId: string): Promise<void> {
  try {
    assertBlobTokenConfigured();
  } catch {
    return;
  }

  const prefix = blobUploadPrefix(uploadId);
  const urls: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) urls.push(blob.url);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (urls.length > 0) {
    await del(urls);
  }
}
