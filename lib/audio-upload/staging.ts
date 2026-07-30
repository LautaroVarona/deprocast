import "server-only";

import {
  getUploadDir,
  getUploadStagingDir,
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

export async function writeMeta(meta: ChunkUploadMeta): Promise<void> {
  await ensureStagingDir(meta.uploadId);
  await writeFile(metaPath(meta.uploadId), JSON.stringify(meta), "utf8");
}

export async function readMeta(uploadId: string): Promise<ChunkUploadMeta | null> {
  try {
    const raw = await readFile(metaPath(uploadId), "utf8");
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
  await ensureStagingDir(uploadId);
  await writeFile(chunkPath(uploadId, index), buffer);
}

export async function assembleChunks(
  uploadId: string,
  totalChunks: number,
): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (let i = 0; i < totalChunks; i += 1) {
    parts.push(await readFile(chunkPath(uploadId, i)));
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
  const dir = getUploadStagingDir(uploadId);
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

export async function listReceivedChunks(uploadId: string): Promise<number[]> {
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
