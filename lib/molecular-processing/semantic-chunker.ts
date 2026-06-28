import { randomUUID } from "node:crypto";
import {
  CHUNK_MAX_LENGTH,
  CHUNK_MIN_LENGTH,
  CHUNK_TARGET_LENGTH,
  MOLECULAR_SIM_DELAY_MS,
} from "./constants";
import type { ChunkerInput, ChunkerResult, ParticulaMetadata } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= CHUNK_MIN_LENGTH);
}

function mergeShortSegments(segments: string[]): string[] {
  const merged: string[] = [];
  let buffer = "";

  for (const segment of segments) {
    if (!buffer) {
      buffer = segment;
      continue;
    }

    if (buffer.length + segment.length + 1 <= CHUNK_TARGET_LENGTH) {
      buffer = `${buffer} ${segment}`;
    } else {
      merged.push(buffer);
      buffer = segment;
    }
  }

  if (buffer) merged.push(buffer);
  return merged;
}

function splitOversized(chunk: string): string[] {
  if (chunk.length <= CHUNK_MAX_LENGTH) return [chunk];

  const sentences = splitIntoSentences(chunk);
  if (sentences.length > 1) return mergeShortSegments(sentences);

  const words = chunk.split(/\s+/u);
  const parts: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > CHUNK_MAX_LENGTH && current) {
      parts.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) parts.push(current);
  return parts.filter((part) => part.length >= CHUNK_MIN_LENGTH);
}

/**
 * Segmentación semántica simulada: párrafos → oraciones → fusión por longitud objetivo.
 */
export function chunkTextSemantically(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/u)
    .map((p) => p.replace(/\s+/gu, " ").trim())
    .filter(Boolean);

  const rawSegments =
    paragraphs.length > 1
      ? paragraphs.flatMap((paragraph) => {
          if (paragraph.length <= CHUNK_MAX_LENGTH) return [paragraph];
          return splitIntoSentences(paragraph);
        })
      : splitIntoSentences(normalized);

  const merged = mergeShortSegments(rawSegments);
  return merged.flatMap(splitOversized);
}

export function buildParticulaMetadata(
  textoFragmento: string,
  fuenteOrigen: string,
): ParticulaMetadata {
  return {
    id: randomUUID(),
    textoFragmento,
    fuenteOrigen,
    fechaIngesta: new Date().toISOString(),
  };
}

export async function runSemanticChunker(
  input: ChunkerInput,
): Promise<ChunkerResult> {
  const started = Date.now();
  const fuenteOrigen = input.fuenteOrigen?.trim() || "ingesta-manual";
  const fragments = chunkTextSemantically(input.texto);

  const particulas: ParticulaMetadata[] = [];
  for (const fragment of fragments) {
    particulas.push(buildParticulaMetadata(fragment, fuenteOrigen));
    await sleep(MOLECULAR_SIM_DELAY_MS.chunkPerParticula);
  }

  const elapsed = Date.now() - started;
  await sleep(
    Math.max(0, MOLECULAR_SIM_DELAY_MS.minChunk - elapsed),
  );

  return {
    particulas,
    totalCaracteres: input.texto.length,
    totalParticulas: particulas.length,
    duracionMs: Date.now() - started,
  };
}
