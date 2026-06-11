import fs from "fs";
import path from "path";
import { GcpSpeechError } from "@/lib/gcp-speech/errors";
import { getFfmpegPath, runFfmpeg, runFfprobe } from "@/lib/gcp-speech/ffmpeg-bin";

export function resolveInputPath(fileUrl: string): string {
  const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  return path.resolve(process.cwd(), "public", relativePath);
}

export async function convertToWav(
  inputPath: string,
  wavPath: string,
): Promise<void> {
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    "-af",
    "highpass=f=200,lowpass=f=3000,afftdn",
    wavPath,
  ]);

  if (!fs.existsSync(wavPath)) {
    throw new GcpSpeechError(
      `FFmpeg no generó el archivo WAV esperado: ${wavPath}`,
    );
  }
}

export async function getAudioDurationSeconds(
  wavPath: string,
): Promise<number> {
  const stdout = await runFfprobe([
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    wavPath,
  ]);

  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new GcpSpeechError(
      `No se pudo determinar la duración del audio: ${wavPath}`,
    );
  }

  return duration;
}

export async function splitIntoChunks(
  wavPath: string,
  tempDir: string,
  chunkSeconds: number,
): Promise<string[]> {
  const chunkPattern = path.join(tempDir, "chunk_%03d.wav");

  await runFfmpeg([
    "-y",
    "-i",
    wavPath,
    "-f",
    "segment",
    "-segment_time",
    String(chunkSeconds),
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    chunkPattern,
  ]);

  const chunkFiles = fs
    .readdirSync(tempDir)
    .filter((name) => /^chunk_\d+\.wav$/.test(name))
    .sort()
    .map((name) => path.join(tempDir, name));

  if (chunkFiles.length === 0) {
    throw new GcpSpeechError(
      "FFmpeg no generó segmentos de audio para la transcripción.",
    );
  }

  return chunkFiles;
}

export function removeFile(filePath: string, label?: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Eliminado ${label ?? "archivo"}: ${filePath}`);
    }
  } catch (error) {
    console.warn(`No se pudo eliminar ${filePath}:`, error);
  }
}

export function removeTempDir(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Directorio temporal eliminado: ${tempDir}`);
    }
  } catch (error) {
    console.warn(`No se pudo eliminar el directorio temporal ${tempDir}:`, error);
  }
}

export function logFfmpegBinaryInUse(): void {
  console.log(`Usando FFmpeg: ${getFfmpegPath()}`);
}
