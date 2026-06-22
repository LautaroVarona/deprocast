import "server-only";
import "dotenv/config";

import type { GenerativeModel } from "@google-cloud/vertexai";
import { randomUUID } from "node:crypto";

import { clampScale } from "@/lib/projects/priority";
import {
  DEFAULT_CAMPO_SLUG,
  resolveCampoSlug,
} from "@/lib/projects/campos";
import {
  extractVertexText,
  getVertexGenerativeModel,
  getVertexModelName,
} from "@/lib/vertex-gemini/client";
import { isRetryableVertexError } from "@/lib/vertex-gemini/errors";

import { extractKgFromText } from "@/lib/kg/extract";
import { ingestKgExtraction } from "@/lib/kg/ingest";
import { ingestDocumentSource } from "@/lib/kg/sources/common";
import type { IngestResult, LlmKgExtraction, MentionSourceType } from "@/lib/kg/types";
import type {
  FractalParent,
  GravityInput,
  PurifierInput,
  PurifierReviewRecord,
  PurifierStageSnapshot,
  SevenDimensions,
} from "@/lib/purifier/types";
import { DUDA_MARKER_REGEX } from "@/lib/purifier/types";
import {
  saveReviewRecord,
} from "@/lib/purifier/review-store";
export {
  REVIEW_DIR,
  deleteReviewRecord,
  getReviewQueueAssetIds,
  listReviewRecords,
  loadReviewRecord,
  saveReviewRecord,
} from "@/lib/purifier/review-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PURIFIER_DEDUP_THRESHOLD = 0.82;

const WHISPER_LOOP_PHRASES = [
  "qué es lo que está pasando",
  "que es lo que esta pasando",
  "qué te iba a decir",
  "que te iba a decir",
  "ehh ehh ehh",
  "mmm mmm mmm",
  "o sea o sea",
  "bueno bueno bueno",
];

const SPANISH_STOPWORDS = new Set([
  "que", "de", "la", "el", "en", "y", "a", "los", "las", "un", "una",
  "por", "con", "no", "se", "es", "al", "lo", "como", "mas", "más",
  "pero", "sus", "le", "ya", "o", "este", "esta", "son", "fue", "ser",
]);

const CLEANUP_SYSTEM_PROMPT = `Eres un editor de transcripciones de voz a texto (STT) en español.

Tu tarea es limpiar el texto sin alterar el significado ni inventar contenido.

Reglas estrictas:
1. Elimina muletillas vacías (eh, em, ehh, viste, o sea, bueno, este, pues, tipo, digamos, etc.) cuando no aporten significado.
2. Corrige puntuación y convierte prosa oral en prosa escrita legible.
3. NO inventes frases, datos, nombres ni conclusiones que no estén en el original.
4. NO elimines ideas sustantivas aunque estén mal formuladas.
5. Si un segmento es incomprensible, ruido o no se puede interpretar con certeza, envuélvelo exactamente así: ==DUDA: texto original o fragmento==
6. NO modifiques ni elimines bloques ==DUDA:...== ya presentes en el texto.
7. Devuelve SOLO el texto limpio, sin markdown, sin explicaciones.`;

const EXTRACT_ESSENCES_PROMPT = `Analiza el texto limpio y extrae un array JSON de conceptos atómicos identificables.

Incluye: nombres propios, leyes, bugs, tecnologías, procesos, entidades y conceptos clave.

Responde ÚNICAMENTE con un array JSON de strings en español, sin explicaciones.
Ejemplo: ["Ley 24.240", "Margarita", "bug de autenticación", "NFC"]`;

const NORMALIZE_SYSTEM_PROMPT = `Eres un archivista del sistema DeProcast. Recibes una transcripción ya limpia.

Genera un archivo Markdown completo con frontmatter YAML que incluya las Siete Dimensiones, título sugerido y vectores de gravedad (prioridad, impacto, dificultad: enteros del 1 al 12).

Estructura obligatoria del frontmatter:
---
materia: "<formato del soporte>"
particula: "<identificador único en kebab-case>"
posicion: "<observador|jugador|avatar>"
onda: "<área taxonómica>"
tiempo: "<fecha ISO-8601>"
espacio: "<entorno de captura>"
field: "<campo de influencia — por defecto babel si no hay otro>"
title: "<título sugerido>"
prioridad: <1-12>
impacto: <1-12>
dificultad: <1-12>
meta_tags_secundarios: ["tag1", "tag2"]
---

# <título>

## Transcripción purificada

<cuerpo preservando marcadores ==DUDA:...==>

Reglas:
- field por defecto: "babel"
- materia por defecto: "audio/transcript"
- espacio por defecto: "local-atanor"
- NO inventes hechos no presentes.
- Preserva todos los ==DUDA:...== intactos.
- Devuelve SOLO el Markdown completo.`;

// ---------------------------------------------------------------------------
// KG source resolution
// ---------------------------------------------------------------------------

function resolveKgSource(
  input: PurifierInput,
  reviewId: string,
): { type: MentionSourceType; id: string; metadata?: Record<string, unknown> } {
  const journalId = input.metadata?.journalId;
  if (journalId) {
    return {
      type: "journal",
      id: journalId,
      metadata: {
        campoSlug: input.gravity?.campoSlug,
        journalPath: input.metadata?.journalPath,
      },
    };
  }

  if (input.assetId) {
    return {
      type: "transcript",
      id: input.assetId,
      metadata: { campoSlug: input.gravity?.campoSlug },
    };
  }

  const captureId = input.metadata?.captureId;
  if (captureId) {
    return {
      type: "raw_document",
      id: captureId,
      metadata: {
        campoSlug: input.gravity?.campoSlug,
        channel: input.metadata?.channel,
        pendingPurificationFile: input.metadata?.pendingPurificationFile,
      },
    };
  }

  return {
    type: "raw_document",
    id: reviewId,
    metadata: { campoSlug: input.gravity?.campoSlug },
  };
}

// ---------------------------------------------------------------------------

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
      await sleep(2000 * attempt);
    }
  }

  throw lastError;
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
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

function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForComparison(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugifyParticula(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `transcript-${base || randomUUID().slice(0, 8)}`;
}

function resolveGravity(input?: GravityInput) {
  return {
    title: input?.title?.trim() ?? "",
    campoSlug: resolveCampoSlug(input?.campoSlug),
    onda: input?.onda?.trim() || "sin-clasificar",
    sourceType: input?.sourceType ?? ("ai_chat" as const),
    prioridad: clampScale(input?.prioridad ?? 6),
    impacto: clampScale(input?.impacto ?? 6),
    dificultad: clampScale(input?.dificultad ?? 6),
  };
}

// ---------------------------------------------------------------------------
// ESTACIÓN 1 — Limpieza Regex
// ---------------------------------------------------------------------------

function amputateWhisperLoops(text: string): { text: string; removed: number } {
  let current = text;
  let removed = 0;

  for (const phrase of WHISPER_LOOP_PHRASES) {
    const normalizedPhrase = normalizeForComparison(phrase);
    const words = normalizedPhrase.split(/\s+/);
    const pattern = new RegExp(
      `(?:${words.map(escapeRegex).join("[\\s,.!?…]*")}[\\s,.!?…]*){4,}`,
      "gi",
    );

    current = current.replace(pattern, (match) => {
      const repetitions = Math.max(0, Math.floor(match.length / phrase.length) - 1);
      removed += repetitions;
      const first = phrase.charAt(0).toUpperCase() + phrase.slice(1);
      return `${first}. `;
    });
  }

  return { text: current, removed };
}

function removeConsecutiveDuplicateSentences(text: string): {
  text: string;
  removed: number;
} {
  const sentences = text.split(/(?<=[.!?…])\s+/);
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

export function station1RegexCleanup(text: string): {
  text: string;
  removedCount: number;
} {
  let current = collapseWhitespace(text);
  let removedCount = 0;

  const whisperPass = amputateWhisperLoops(current);
  current = whisperPass.text;
  removedCount += whisperPass.removed;

  const sentencePass = removeConsecutiveDuplicateSentences(current);
  current = sentencePass.text;
  removedCount += sentencePass.removed;

  return { text: current, removedCount };
}

// ---------------------------------------------------------------------------
// ESTACIÓN 2 — Limpieza Semántica (Gemini)
// ---------------------------------------------------------------------------

export async function station2SemanticCleanup(
  text: string,
  model?: GenerativeModel,
): Promise<string> {
  return generateVertexText(CLEANUP_SYSTEM_PROMPT, text, model);
}

// ---------------------------------------------------------------------------
// ESTACIÓN 3 — Deduplicación
// ---------------------------------------------------------------------------

function tokenizeParagraph(paragraph: string): Set<string> {
  const tokens = paragraph
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/==duda:\s*.+?==/gi, " ")
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

export function station3Deduplicate(
  text: string,
  threshold: number = PURIFIER_DEDUP_THRESHOLD,
): { text: string; mergedCount: number } {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    return { text, mergedCount: 0 };
  }

  const kept: string[] = [];
  const tokenSets: Set<string>[] = [];
  let mergedCount = 0;

  for (const paragraph of paragraphs) {
    const tokens = tokenizeParagraph(paragraph);
    let merged = false;

    for (let i = 0; i < kept.length; i += 1) {
      const similarity = jaccardSimilarity(tokens, tokenSets[i]);
      if (similarity >= threshold) {
        kept[i] = kept[i].length >= paragraph.length ? kept[i] : paragraph;
        tokenSets[i] = tokenizeParagraph(kept[i]);
        mergedCount += 1;
        merged = true;
        break;
      }
    }

    if (!merged) {
      kept.push(paragraph);
      tokenSets.push(tokens);
    }
  }

  return { text: kept.join("\n\n"), mergedCount };
}

// ---------------------------------------------------------------------------
// ESTACIÓN 4 — Extracción de Esencias (Gemini)
// ---------------------------------------------------------------------------

export async function station4ExtractEssences(
  text: string,
  model?: GenerativeModel,
): Promise<string[]> {
  const raw = await generateVertexText(EXTRACT_ESSENCES_PROMPT, text, model);

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean).slice(0, 30);
    }
  } catch {
    const fallback = raw.match(/\[([\s\S]*?)\]/);
    if (fallback) {
      try {
        const parsed = JSON.parse(fallback[0]) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map(String).filter(Boolean).slice(0, 30);
        }
      } catch {
        // ignore
      }
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// ESTACIÓN 5 — Normalización (Gemini)
// ---------------------------------------------------------------------------

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

export function parseFrontmatterFromMarkdown(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const parsed = parseYamlValue(line.trim());
    if (parsed) fields[parsed.key] = parsed.value;
  }
  return fields;
}

function buildNormalizePrompt(
  dedupedText: string,
  metaTags: string[],
  gravity: ReturnType<typeof resolveGravity>,
  filename: string,
): string {
  return [
    "Metadatos del bloque:",
    `filename: ${filename}`,
    `campo_sugerido: ${gravity.campoSlug}`,
    `onda_sugerida: ${gravity.onda}`,
    `prioridad_sugerida: ${gravity.prioridad}`,
    `impacto_sugerido: ${gravity.impacto}`,
    `dificultad_sugerida: ${gravity.dificultad}`,
    `titulo_sugerido: ${gravity.title || filename}`,
    `meta_tags_secundarios: ${JSON.stringify(metaTags)}`,
  ].join("\n") + `\n\nTranscripción purificada:\n\n${dedupedText}`;
}

export async function station5Normalize(
  dedupedText: string,
  metaTags: string[],
  gravity: ReturnType<typeof resolveGravity>,
  filename: string,
  model?: GenerativeModel,
): Promise<{ normalizedMarkdown: string; dimensions: SevenDimensions & { title: string; prioridad: number; impacto: number; dificultad: number } }> {
  const normalizedMarkdown = await generateVertexText(
    NORMALIZE_SYSTEM_PROMPT,
    buildNormalizePrompt(dedupedText, metaTags, gravity, filename),
    model,
  );

  const fields = parseFrontmatterFromMarkdown(normalizedMarkdown);
  const particula = fields.particula || slugifyParticula(filename);

  const dimensions = {
    materia: fields.materia || "audio/transcript",
    particula,
    posicion: fields.posicion || "observador",
    onda: fields.onda || gravity.onda,
    tiempo: fields.tiempo || new Date().toISOString().slice(0, 10),
    espacio: fields.espacio || "local-atanor",
    field: fields.field || DEFAULT_CAMPO_SLUG,
    title: fields.title || gravity.title || filename.replace(/\.[^.]+$/, ""),
    prioridad: clampScale(Number(fields.prioridad) || gravity.prioridad),
    impacto: clampScale(Number(fields.impacto) || gravity.impacto),
    dificultad: clampScale(Number(fields.dificultad) || gravity.dificultad),
  };

  return { normalizedMarkdown, dimensions };
}

// ---------------------------------------------------------------------------
// ESTACIÓN 6 — Segmentación Fractal
// ---------------------------------------------------------------------------

const LINES_PER_CHILD = 4;

export function station6FractalSegmentation(text: string): FractalParent[] {
  const blocks = text
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n").filter((l) => l.trim());
    const children: FractalParent["children"] = [];

    for (let i = 0; i < lines.length; i += LINES_PER_CHILD) {
      const chunkLines = lines.slice(i, i + LINES_PER_CHILD);
      children.push({
        index: children.length,
        lines: chunkLines,
        content: chunkLines.join("\n"),
      });
    }

    if (children.length === 0) {
      children.push({ index: 0, lines: [block], content: block });
    }

    return {
      index: blockIndex,
      context: block.slice(0, 200),
      children,
    };
  });
}

// ---------------------------------------------------------------------------
// Doubts extraction
// ---------------------------------------------------------------------------

export function extractDoubts(text: string): string[] {
  const doubts: string[] = [];
  const regex = new RegExp(DUDA_MARKER_REGEX.source, DUDA_MARKER_REGEX.flags);

  for (const match of text.matchAll(regex)) {
    const doubt = match[1]?.trim();
    if (doubt) doubts.push(doubt);
  }

  // Legacy format support
  const legacyRegex = /===DUDA:\s*(.+?)===/gs;
  for (const match of text.matchAll(legacyRegex)) {
    const doubt = match[1]?.trim();
    if (doubt && !doubts.includes(doubt)) doubts.push(doubt);
  }

  return doubts;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function runPurificationPipeline(
  input: PurifierInput,
  options: { model?: GenerativeModel; saveReview?: boolean; extractKg?: boolean } = {},
): Promise<PurifierReviewRecord> {
  const gravity = resolveGravity(input.gravity);
  const filename = input.filename ?? `asset-${input.assetId ?? randomUUID().slice(0, 8)}`;
  const reviewId = randomUUID();
  const stages: PurifierStageSnapshot[] = [];

  // Station 1
  const regexResult = station1RegexCleanup(input.rawText);
  stages.push({
    station: 1,
    name: "Limpieza Regex",
    input: input.rawText,
    output: regexResult.text,
    meta: {
      removedCount: regexResult.removedCount,
      inputChars: input.rawText.length,
      outputChars: regexResult.text.length,
    },
  });

  // Station 2
  const semanticText = await station2SemanticCleanup(regexResult.text, options.model);
  stages.push({
    station: 2,
    name: "Limpieza Semántica",
    input: regexResult.text,
    output: semanticText,
    meta: {
      inputChars: regexResult.text.length,
      outputChars: semanticText.length,
      doubtCount: extractDoubts(semanticText).length,
    },
  });

  // Station 3
  const dedupResult = station3Deduplicate(semanticText);
  stages.push({
    station: 3,
    name: "Deduplicación",
    input: semanticText,
    output: dedupResult.text,
    meta: {
      mergedCount: dedupResult.mergedCount,
      paragraphsRemoved: dedupResult.mergedCount,
    },
  });

  // Station 4
  const metaTags = await station4ExtractEssences(dedupResult.text, options.model);
  stages.push({
    station: 4,
    name: "Extracción de Esencias",
    input: dedupResult.text,
    output: JSON.stringify(metaTags),
    meta: { count: metaTags.length, tags: metaTags.slice(0, 5) },
  });

  let kgExtraction: LlmKgExtraction | undefined;
  let kgIngest: IngestResult | undefined;

  if (options.extractKg) {
    kgExtraction = await extractKgFromText(dedupResult.text, options.model);
    stages.push({
      station: 41,
      name: "Extracción KG",
      input: dedupResult.text,
      output: JSON.stringify(kgExtraction),
      meta: {
        entityCount: kgExtraction.entities.length,
        relationCount: kgExtraction.relations.length,
        inputChars: dedupResult.text.length,
      },
    });

    if (kgExtraction.entities.length > 0) {
      const captureId = input.metadata?.captureId;
      const pendingFile = input.metadata?.pendingPurificationFile;

      if (captureId && pendingFile) {
        const documentPath = `data/raw_documents/pending_purification/${pendingFile}`;
        const outcome = await ingestDocumentSource({
          sourceType: "raw_document",
          sourceId: captureId,
          documentPath,
          title: input.gravity?.title ?? filename,
          documentMeta: {
            captureId,
            channel: input.metadata?.channel,
            reviewId,
          },
          body: "",
          structured: kgExtraction,
          sourceMetadata: {
            campoSlug: input.gravity?.campoSlug,
            channel: input.metadata?.channel,
            reviewId,
          },
          model: options.model,
        });
        kgIngest = outcome.result;
      } else {
        kgIngest = await ingestKgExtraction({
          extraction: kgExtraction,
          source: resolveKgSource(input, reviewId),
        });
      }
    }
  }

  // Station 5
  const { normalizedMarkdown, dimensions } = await station5Normalize(
    dedupResult.text,
    metaTags,
    gravity,
    filename,
    options.model,
  );
  stages.push({
    station: 5,
    name: "Normalización",
    input: dedupResult.text,
    output: normalizedMarkdown,
    meta: {
      inputChars: dedupResult.text.length,
      outputChars: normalizedMarkdown.length,
      doubtCount: extractDoubts(normalizedMarkdown).length,
    },
  });

  // Station 6
  const bodyMatch = normalizedMarkdown.match(
    /##\s+Transcripción purificada\s*\n+([\s\S]*?)$/i,
  );
  const bodyText = bodyMatch?.[1]?.trim() ?? dedupResult.text;
  const fractalSegments = station6FractalSegmentation(bodyText);
  const childCount = fractalSegments.reduce((sum, p) => sum + p.children.length, 0);
  stages.push({
    station: 6,
    name: "Segmentación Fractal",
    input: bodyText,
    output: JSON.stringify(fractalSegments),
    meta: { parentCount: fractalSegments.length, childCount },
  });

  const record: PurifierReviewRecord = {
    schemaVersion: "2",
    reviewId,
    particula: dimensions.particula,
    assetId: input.assetId,
    gravity,
    source: {
      filename,
      metadata: input.metadata ?? {},
    },
    originalText: input.rawText,
    stages,
    afterRegex: regexResult.text,
    cleanedText: dedupResult.text,
    metaTagsSecundarios: metaTags,
    doubts: extractDoubts(dedupResult.text),
    suggestedDimensions: dimensions,
    normalizedMarkdown,
    fractalSegments,
    dedup: {
      mergedCount: dedupResult.mergedCount,
      threshold: PURIFIER_DEDUP_THRESHOLD,
    },
    regex: { removedCount: regexResult.removedCount },
    processedAt: new Date().toISOString(),
    model: getVertexModelName(),
    kgExtraction,
    kgIngest,
  };

  if (options.saveReview !== false) {
    await saveReviewRecord(record);
  }

  return record;
}
