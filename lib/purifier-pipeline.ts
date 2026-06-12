import "dotenv/config";

import type { GenerativeModel } from "@google-cloud/vertexai";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  extractVertexText,
  getVertexGenerativeModel,
  getVertexModelName,
} from "@/lib/vertex-gemini/client";
import { isRetryableVertexError } from "@/lib/vertex-gemini/errors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PURIFIER_DEDUP_THRESHOLD = 0.82;
export const DEFAULT_VERTEX_MODEL = "gemini-2.5-flash";
export const DUDA_MARKER_REGEX = /===DUDA:\s*(.+?)===/gs;

const REVIEW_DIR = path.join(
  process.cwd(),
  "data",
  "raw_documents",
  "review",
);

const SEVEN_DIMENSION_KEYS = [
  "materia",
  "particula",
  "posicion",
  "onda",
  "tiempo",
  "espacio",
  "field",
] as const;

const SPANISH_STOPWORDS = new Set([
  "que",
  "de",
  "la",
  "el",
  "en",
  "y",
  "a",
  "los",
  "las",
  "un",
  "una",
  "por",
  "con",
  "no",
  "se",
  "es",
  "al",
  "lo",
  "como",
  "más",
  "mas",
  "pero",
  "sus",
  "le",
  "ya",
  "o",
  "este",
  "esta",
  "estos",
  "estas",
  "eso",
  "esa",
  "son",
  "fue",
  "ser",
  "ha",
  "han",
  "del",
  "mi",
  "tu",
  "su",
]);

const CLEANUP_SYSTEM_PROMPT = `Eres un editor de transcripciones de voz a texto (STT) en español.

Tu tarea es limpiar el texto sin alterar el significado ni inventar contenido.

Reglas estrictas:
1. Elimina muletillas vacías (eh, em, o sea, bueno, este, pues, tipo, digamos, etc.) cuando no aporten significado.
2. Corrige puntuación y convierte prosa oral en prosa escrita legible.
3. NO inventes frases, datos, nombres ni conclusiones que no estén en el original.
4. NO elimines ideas sustantivas aunque estén mal formuladas.
5. Si un segmento es incomprensible, ruido o no se puede interpretar con certeza, envuélvelo exactamente así: ===DUDA: texto original o fragmento=== 
6. NO modifiques ni elimines bloques ===DUDA:...=== ya presentes en el texto.
7. Devuelve SOLO el texto limpio, sin markdown, sin explicaciones, sin comentarios.`;

const NORMALIZE_SYSTEM_PROMPT = `Eres un archivista del sistema DeProcast. Recibes una transcripción de audio ya limpia.

Genera un archivo Markdown completo con frontmatter YAML que incluya las Siete Dimensiones más un título sugerido.

Estructura obligatoria del frontmatter:
---
materia: "<formato del soporte>"
particula: "<identificador único estable en kebab-case>"
posicion: "<observador|jugador|avatar o valor inferido conservador>"
onda: "<área taxonómica inferida del contenido>"
tiempo: "<fecha ISO-8601 o rango>"
espacio: "<entorno de captura>"
field: "<campo de influencia cruzada>"
title: "<título sugerido en español>"
---

# <título>

## Transcripción purificada

<cuerpo con el texto recibido, preservando marcadores ===DUDA:...===>

Reglas:
- Usa los metadatos del bloque (filename, fechas) cuando se proporcionen.
- materia por defecto: "audio/transcript"
- espacio por defecto: "local-atanor"
- particula: deriva del nombre de archivo en kebab-case con prefijo "transcript-"
- Inferí onda, posicion y field con conservadurismo desde el contenido.
- NO inventes hechos no presentes en la transcripción.
- Preserva todos los marcadores ===DUDA:...=== intactos.
- Devuelve SOLO el Markdown completo, sin explicaciones.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SevenDimensions = {
  materia: string;
  particula: string;
  posicion: string;
  onda: string;
  tiempo: string;
  espacio: string;
  field: string;
};

export type TranscriptBlockMetadata = {
  fechaOriginal: string | null;
  estado: string | null;
  transcritoEl: string | null;
  confianza: string | null;
};

export type TranscriptBlock = {
  index: number;
  filename: string;
  metadata: TranscriptBlockMetadata;
  rawText: string;
};

export type RegexCleanupResult = {
  text: string;
  removedCount: number;
};

export type DedupMergedPair = {
  kept: string;
  discarded: string;
  similarity: number;
};

export type DedupResult = {
  text: string;
  mergedPairs: DedupMergedPair[];
  threshold: number;
};

export type SuggestedDimensions = SevenDimensions & { title: string };

export type PurifierReviewRecord = {
  schemaVersion: "1";
  particula: string;
  source: {
    index: number;
    filename: string;
    metadata: TranscriptBlockMetadata;
  };
  originalText: string;
  afterRegex: string;
  cleanedText: string;
  doubts: string[];
  suggestedDimensions: SuggestedDimensions;
  normalizedMarkdown: string;
  dedup: {
    mergedPairs: DedupMergedPair[];
    threshold: number;
  };
  regex: { removedCount: number };
  processedAt: string;
  model: string;
};

export type PurifyBlockOptions = {
  model?: GenerativeModel;
  dedupThreshold?: number;
  saveReview?: boolean;
};

// ---------------------------------------------------------------------------
// Vertex Gemini client
// ---------------------------------------------------------------------------

function getModelName(): string {
  return getVertexModelName();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withVertexRetry<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableVertexError(error) || attempt === maxAttempts) {
        throw error;
      }
      const waitMs = 2000 * attempt;
      console.warn(
        `${label} — error temporal, reintento ${attempt}/${maxAttempts - 1} en ${waitMs / 1000}s...`,
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}

async function generateVertexText(
  systemPrompt: string,
  userContent: string,
  modelOverride?: GenerativeModel,
): Promise<string> {
  const model = modelOverride ?? getVertexGenerativeModel(systemPrompt);
  const result = await withVertexRetry("Vertex generateContent", () =>
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: userContent }] }],
    }),
  );

  return stripMarkdownFences(extractVertexText(result));
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text;
}

function getRequestDelayMs(): number {
  const raw =
    process.env.VERTEX_REQUEST_DELAY_MS ??
    process.env.GEMINI_REQUEST_DELAY_MS ??
    "500";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseMetadataLine(
  line: string,
  metadata: TranscriptBlockMetadata,
): void {
  const fechaMatch = line.match(
    /\*\*Fecha original del audio:\*\*\s*(.+)/i,
  );
  if (fechaMatch) {
    metadata.fechaOriginal = fechaMatch[1].trim();
    return;
  }

  const estadoMatch = line.match(/\*\*Estado:\*\*\s*(.+)/i);
  if (estadoMatch) {
    metadata.estado = estadoMatch[1].trim();
    return;
  }

  const transcritoMatch = line.match(/\*\*Transcrito el:\*\*\s*(.+)/i);
  if (transcritoMatch) {
    metadata.transcritoEl = transcritoMatch[1].trim();
    return;
  }

  const confianzaMatch = line.match(/\*\*Confianza:\*\*\s*(.+)/i);
  if (confianzaMatch) {
    metadata.confianza = confianzaMatch[1].trim();
  }
}

export function parseTranscripcionesMarkdown(content: string): TranscriptBlock[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new Error("El archivo transcripciones.md está vacío.");
  }

  const sectionRegex =
    /^##\s+(\d+)\.\s+(.+?)\n([\s\S]*?)(?=^##\s+\d+\.|$)/gm;
  const blocks: TranscriptBlock[] = [];

  for (const match of normalized.matchAll(sectionRegex)) {
    const index = Number.parseInt(match[1], 10);
    const filename = match[2].trim();
    const body = match[3].trim();

    const metadata: TranscriptBlockMetadata = {
      fechaOriginal: null,
      estado: null,
      transcritoEl: null,
      confianza: null,
    };

    for (const line of body.split("\n")) {
      parseMetadataLine(line.trim(), metadata);
    }

    const transcriptMatch = body.match(
      /###\s+Transcripción\s*\n+([\s\S]*?)(?:\n+---\s*)?$/i,
    );
    const rawText = transcriptMatch?.[1]?.trim() ?? "";

    if (rawText) {
      blocks.push({ index, filename, metadata, rawText });
    }
  }

  if (blocks.length === 0) {
    throw new Error(
      "No se encontraron bloques de transcripción. Verificá que el archivo siga el formato de buildCombinedTranscriptMarkdown.",
    );
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Phase 1a — Regex cleanup
// ---------------------------------------------------------------------------

function normalizeForComparison(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeConsecutiveDuplicateSentences(text: string): {
  text: string;
  removed: number;
} {
  const sentences = text.split(/(?<=[.!?…])\s+/);
  if (sentences.length <= 1) {
    return { text, removed: 0 };
  }

  const result: string[] = [];
  let removed = 0;
  let previous = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const normalized = normalizeForComparison(trimmed);
    if (normalized && normalized === previous) {
      removed += 1;
      continue;
    }

    result.push(trimmed);
    previous = normalized;
  }

  return { text: result.join(" "), removed };
}

function removeRepeatedPhraseChunks(text: string): {
  text: string;
  removed: number;
} {
  const pattern = /(\b(?:\w+\s+){2,11}\w+\b)(\s+\1\b)+/gi;
  let removed = 0;
  const result = text.replace(pattern, (match, phrase: string) => {
    const repetitions = match.split(phrase).length - 1;
    removed += Math.max(0, repetitions - 1);
    return phrase;
  });
  return { text: result, removed };
}

function removeConsecutiveDuplicateWords(text: string): {
  text: string;
  removed: number;
} {
  const pattern = /\b(\w+)(?:\s+\1\b)+/gi;
  let removed = 0;
  const result = text.replace(pattern, (match, word: string) => {
    const count = match.split(/\s+/).length;
    removed += count - 1;
    return word;
  });
  return { text: result, removed };
}

export function removeConsecutiveDuplicatePhrases(
  text: string,
): RegexCleanupResult {
  let current = collapseWhitespace(text);
  let removedCount = 0;

  const sentencePass = removeConsecutiveDuplicateSentences(current);
  current = sentencePass.text;
  removedCount += sentencePass.removed;

  const phrasePass = removeRepeatedPhraseChunks(current);
  current = phrasePass.text;
  removedCount += phrasePass.removed;

  const wordPass = removeConsecutiveDuplicateWords(current);
  current = wordPass.text;
  removedCount += wordPass.removed;

  return { text: current, removedCount };
}

// ---------------------------------------------------------------------------
// Phase 1b — Gemini cleanup
// ---------------------------------------------------------------------------

export async function cleanTextWithGemini(
  text: string,
  model?: GenerativeModel,
): Promise<string> {
  return generateVertexText(CLEANUP_SYSTEM_PROMPT, text, model);
}

// ---------------------------------------------------------------------------
// Phase 2 — Deduplication
// ---------------------------------------------------------------------------

function tokenizeParagraph(paragraph: string): Set<string> {
  const tokens = paragraph
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/===duda:\s*.+?===/gi, " ")
    .split(/[^a-z0-9áéíóúüñ]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !SPANISH_STOPWORDS.has(t));

  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function countDudaMarkers(text: string): number {
  const matches = text.match(/===DUDA:/gi);
  return matches?.length ?? 0;
}

function chooseParagraphToKeep(a: string, b: string): {
  kept: string;
  discarded: string;
} {
  const dudaA = countDudaMarkers(a);
  const dudaB = countDudaMarkers(b);

  if (dudaA !== dudaB) {
    return dudaA > dudaB
      ? { kept: a, discarded: b }
      : { kept: b, discarded: a };
  }

  return a.length >= b.length
    ? { kept: a, discarded: b }
    : { kept: b, discarded: a };
}

export function deduplicateParagraphs(
  text: string,
  threshold: number = PURIFIER_DEDUP_THRESHOLD,
): DedupResult {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    return { text, mergedPairs: [], threshold };
  }

  const kept: string[] = [];
  const tokenSets: Set<string>[] = [];
  const mergedPairs: DedupMergedPair[] = [];

  for (const paragraph of paragraphs) {
    const tokens = tokenizeParagraph(paragraph);
    let merged = false;

    for (let i = 0; i < kept.length; i += 1) {
      const similarity = jaccardSimilarity(tokens, tokenSets[i]);
      if (similarity >= threshold) {
        const choice = chooseParagraphToKeep(kept[i], paragraph);
        mergedPairs.push({
          kept: choice.kept,
          discarded: choice.discarded,
          similarity,
        });
        kept[i] = choice.kept;
        tokenSets[i] = tokenizeParagraph(choice.kept);
        merged = true;
        break;
      }
    }

    if (!merged) {
      kept.push(paragraph);
      tokenSets.push(tokens);
    }
  }

  return {
    text: kept.join("\n\n"),
    mergedPairs,
    threshold,
  };
}

// ---------------------------------------------------------------------------
// Phase 3 — Normalization
// ---------------------------------------------------------------------------

function slugifyParticula(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `transcript-${base || "sin-nombre"}`;
}

function parseYamlValue(line: string): { key: string; value: string } | null {
  const match = line.match(/^([a-z_]+):\s*(.+)$/i);
  if (!match) return null;

  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key: match[1], value };
}

export function parseFrontmatterFromMarkdown(
  markdown: string,
): SuggestedDimensions | null {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const parsed = parseYamlValue(line.trim());
    if (parsed) {
      fields[parsed.key] = parsed.value;
    }
  }

  const hasAllDimensions = SEVEN_DIMENSION_KEYS.every(
    (key) => typeof fields[key] === "string" && fields[key].length > 0,
  );
  if (!hasAllDimensions || !fields.title) {
    return null;
  }

  return {
    materia: fields.materia,
    particula: fields.particula,
    posicion: fields.posicion,
    onda: fields.onda,
    tiempo: fields.tiempo,
    espacio: fields.espacio,
    field: fields.field,
    title: fields.title,
  };
}

function buildNormalizeUserPrompt(
  block: TranscriptBlock,
  dedupedText: string,
): string {
  const particula = slugifyParticula(block.filename);
  const metaLines = [
    `filename: ${block.filename}`,
    `particula_sugerida: ${particula}`,
    block.metadata.fechaOriginal
      ? `fecha_original: ${block.metadata.fechaOriginal}`
      : null,
    block.metadata.estado ? `estado: ${block.metadata.estado}` : null,
    block.metadata.confianza
      ? `confianza: ${block.metadata.confianza}`
      : null,
    block.metadata.transcritoEl
      ? `transcrito_el: ${block.metadata.transcritoEl}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Metadatos del bloque:\n${metaLines}\n\nTranscripción purificada:\n\n${dedupedText}`;
}

export async function normalizeWithGemini(
  block: TranscriptBlock,
  dedupedText: string,
  model?: GenerativeModel,
): Promise<{ normalizedMarkdown: string; suggestedDimensions: SuggestedDimensions }> {
  const normalizedMarkdown = await generateVertexText(
    NORMALIZE_SYSTEM_PROMPT,
    buildNormalizeUserPrompt(block, dedupedText),
    model,
  );

  const parsed = parseFrontmatterFromMarkdown(normalizedMarkdown);
  const fallbackParticula = slugifyParticula(block.filename);

  const suggestedDimensions: SuggestedDimensions = parsed ?? {
    materia: "audio/transcript",
    particula: fallbackParticula,
    posicion: "observador|estudianta",
    onda: "sin-clasificar",
    tiempo: block.metadata.fechaOriginal ?? new Date().toISOString().slice(0, 10),
    espacio: "local-atanor",
    field: "cognitive-exo-cortex",
    title: block.filename.replace(/\.[^.]+$/, ""),
  };

  return { normalizedMarkdown, suggestedDimensions };
}

// ---------------------------------------------------------------------------
// Phase 4 — HITL review
// ---------------------------------------------------------------------------

export function extractDoubts(text: string): string[] {
  const doubts: string[] = [];
  const regex = new RegExp(DUDA_MARKER_REGEX.source, DUDA_MARKER_REGEX.flags);

  for (const match of text.matchAll(regex)) {
    const doubt = match[1]?.trim();
    if (doubt) {
      doubts.push(doubt);
    }
  }

  return doubts;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function saveReviewRecord(
  record: PurifierReviewRecord,
): Promise<{ filepath: string }> {
  await mkdir(REVIEW_DIR, { recursive: true });

  let filename = `${record.particula}.json`;
  let suffix = 1;
  while (await fileExists(path.join(REVIEW_DIR, filename))) {
    const timestamp = Math.floor(Date.now() / 1000);
    filename = `${timestamp}_${record.particula}.json`;
    suffix += 1;
    if (suffix > 100) break;
  }

  const filepath = path.join(REVIEW_DIR, filename);
  await writeFile(filepath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");

  return { filepath };
}

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

export async function purifyTranscriptBlock(
  block: TranscriptBlock,
  options: PurifyBlockOptions = {},
): Promise<PurifierReviewRecord> {
  const model = options.model;
  const dedupThreshold = options.dedupThreshold ?? PURIFIER_DEDUP_THRESHOLD;
  const saveReview = options.saveReview ?? true;

  const regexResult = removeConsecutiveDuplicatePhrases(block.rawText);
  const afterGeminiCleanup = await cleanTextWithGemini(regexResult.text, model);
  const dedupResult = deduplicateParagraphs(afterGeminiCleanup, dedupThreshold);
  const { normalizedMarkdown, suggestedDimensions } = await normalizeWithGemini(
    block,
    dedupResult.text,
    model,
  );

  const record: PurifierReviewRecord = {
    schemaVersion: "1",
    particula: suggestedDimensions.particula,
    source: {
      index: block.index,
      filename: block.filename,
      metadata: block.metadata,
    },
    originalText: block.rawText,
    afterRegex: regexResult.text,
    cleanedText: dedupResult.text,
    doubts: extractDoubts(dedupResult.text),
    suggestedDimensions,
    normalizedMarkdown,
    dedup: {
      mergedPairs: dedupResult.mergedPairs,
      threshold: dedupResult.threshold,
    },
    regex: { removedCount: regexResult.removedCount },
    processedAt: new Date().toISOString(),
    model: getModelName(),
  };

  if (saveReview) {
    await saveReviewRecord(record);
  }

  return record;
}

export async function purifyTranscripcionesFile(
  filePath: string,
  options: PurifyBlockOptions = {},
): Promise<PurifierReviewRecord[]> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const content = await readFile(absolutePath, "utf-8");
  const blocks = parseTranscripcionesMarkdown(content);
  const results: PurifierReviewRecord[] = [];
  const delayMs = getRequestDelayMs();

  for (let i = 0; i < blocks.length; i += 1) {
    const record = await purifyTranscriptBlock(blocks[i], options);
    results.push(record);

    if (delayMs > 0 && i < blocks.length - 1) {
      await sleep(delayMs);
    }
  }

  return results;
}
