import "server-only";

import { transcribeSync } from "@/lib/deepgram/transcribe-sync";
import { convertToWav } from "@/lib/stt/audio-prep";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function transcribeSaludAudioBuffer(
  buffer: Buffer,
  originalFilename: string,
): Promise<{ rawText: string; confidence: number | null }> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "salud-audio-"));
  const safeName = path.basename(originalFilename).replace(/[^\w.-]+/g, "_");
  const inputPath = path.join(tmpDir, safeName || "nota.webm");
  const wavPath = path.join(tmpDir, "note.wav");

  try {
    await writeFile(inputPath, buffer);
    await convertToWav(inputPath, wavPath);
    return await transcribeSync(`salud-${randomUUID()}`, wavPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
