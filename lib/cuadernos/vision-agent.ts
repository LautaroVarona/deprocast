import { cohereChatWithImages } from "@/lib/cohere/vision";
import type {
  PageAnalysis,
  Quanta,
  StructuralVector,
  VisionAgentResult,
} from "@/lib/cuadernos/types";
import { z } from "zod";

export const ATOMIC_VISION_PROMPT = `Actúas como un Agente de Visión Atómica para cuadernos físicos manuscritos.

Tu tarea es realizar un "OCR Sintáctico y Esotérico" sobre la imagen de una sola página:

1. VECTOR SEMÁNTICO (semanticVector): Transcribe el texto manuscrito de forma LITERAL al español. Conserva tachones como ~~texto~~. No inventes contenido.

2. VECTOR ESTRUCTURAL (structuralVector): Detecta diagramas, flechas, símbolos, runas o estructuras geométricas. Incluye tags temáticos, proyectos asociados si aparecen, y un mapa de relaciones visuales.

3. QUÁNTOMOS (quanta): Fragmentos atómicos de texto detectados con su caja delimitadora normalizada (0-1 respecto al ancho/alto de la imagen).

4. ANÁLISIS DE PÁGINA (pageAnalysis):
   - suggestedTitle: título corto sugerido para la página
   - explanation: explicación breve del sentido de la página
   - writtenContentDescription: descripción del contenido escrito (qué se ve escrito)
   - semanticTags: lista de tags semánticos
   - ner: entidades segmentadas en persona / org / proyecto / lugar / concepto (arrays de strings)
   - pageNumber: entero forzado (si no es legible en la imagen, usá el pageNumberHint del usuario)

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin comentarios) con esta forma exacta:
{
  "semanticVector": "string",
  "structuralVector": {
    "tags": ["string"],
    "projects": ["string"],
    "hasDiagram": boolean,
    "hasSymbols": boolean,
    "hasArrows": boolean,
    "hasRunes": boolean,
    "hasGeometry": boolean,
    "spatialMap": { "description": "string", "elements": [{ "label": "string", "role": "string", "connectsTo": ["string"] }] },
    "visualRelations": [{ "from": "string", "to": "string", "relation": "string" }],
    "rawNotes": "string"
  },
  "quanta": [{ "id": "q1", "text": "string", "bbox": { "x": 0.1, "y": 0.2, "w": 0.3, "h": 0.05 }, "confidence": 0.9 }],
  "pageAnalysis": {
    "suggestedTitle": "string",
    "explanation": "string",
    "writtenContentDescription": "string",
    "semanticTags": ["string"],
    "ner": {
      "persona": ["string"],
      "org": ["string"],
      "proyecto": ["string"],
      "lugar": ["string"],
      "concepto": ["string"]
    },
    "pageNumber": 1
  }
}`;

const bboxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

const nerSchema = z.object({
  persona: z.array(z.string()).default([]),
  org: z.array(z.string()).default([]),
  proyecto: z.array(z.string()).default([]),
  lugar: z.array(z.string()).default([]),
  concepto: z.array(z.string()).default([]),
});

const pageAnalysisSchema = z.object({
  suggestedTitle: z.string().default(""),
  explanation: z.string().default(""),
  writtenContentDescription: z.string().default(""),
  semanticTags: z.array(z.string()).default([]),
  ner: nerSchema.default({
    persona: [],
    org: [],
    proyecto: [],
    lugar: [],
    concepto: [],
  }),
  pageNumber: z.union([z.number(), z.string()]),
});

const visionResponseSchema = z.object({
  semanticVector: z.string(),
  structuralVector: z.object({
    tags: z.array(z.string()).default([]),
    projects: z.array(z.string()).default([]),
    hasDiagram: z.boolean().default(false),
    hasSymbols: z.boolean().default(false),
    hasArrows: z.boolean().default(false),
    hasRunes: z.boolean().default(false),
    hasGeometry: z.boolean().default(false),
    spatialMap: z
      .object({
        description: z.string(),
        elements: z.array(
          z.object({
            label: z.string(),
            role: z.string(),
            connectsTo: z.array(z.string()).optional(),
          }),
        ),
      })
      .optional(),
    visualRelations: z
      .array(
        z.object({
          from: z.string(),
          to: z.string(),
          relation: z.string(),
        }),
      )
      .default([]),
    rawNotes: z.string().optional(),
  }),
  quanta: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        bbox: bboxSchema,
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .default([]),
  pageAnalysis: pageAnalysisSchema.optional(),
});

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
  if (fenced) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function coercePageNumber(value: unknown, hint?: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) return Math.max(1, parseInt(match[0], 10));
  }
  return hint && hint > 0 ? hint : 1;
}

function buildPageAnalysis(
  raw: z.infer<typeof pageAnalysisSchema> | undefined,
  semanticVector: string,
  structural: StructuralVector,
  pageNumberHint?: number,
): PageAnalysis {
  const pageNumber = coercePageNumber(raw?.pageNumber, pageNumberHint);
  const semanticTags =
    raw?.semanticTags?.length
      ? raw.semanticTags
      : structural.tags;

  return {
    suggestedTitle: (raw?.suggestedTitle ?? "").trim() || `Página ${pageNumber}`,
    explanation: (raw?.explanation ?? "").trim(),
    writtenContentDescription:
      (raw?.writtenContentDescription ?? "").trim() ||
      semanticVector.slice(0, 400),
    semanticTags,
    ner: {
      persona: raw?.ner?.persona ?? [],
      org: raw?.ner?.org ?? [],
      proyecto: raw?.ner?.proyecto ?? structural.projects,
      lugar: raw?.ner?.lugar ?? [],
      concepto: raw?.ner?.concepto ?? [],
    },
    pageNumber,
  };
}

export async function runAtomicVisionAgent(input: {
  buffer: Buffer;
  mimeType: string;
  pageNumberHint?: number;
}): Promise<VisionAgentResult> {
  const base64 = input.buffer.toString("base64");
  const hint = input.pageNumberHint;

  const raw = stripJsonFences(
    await cohereChatWithImages({
      systemPrompt: ATOMIC_VISION_PROMPT,
      images: [{ base64, mimeType: input.mimeType }],
      userText: [
        "Analiza esta página de cuaderno y devuelve el JSON con semanticVector, structuralVector, quanta y pageAnalysis.",
        hint ? `pageNumberHint: ${hint}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      jsonMode: true,
    }),
  );

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "El Agente de Visión no devolvió JSON válido. Reintentá el procesamiento.",
    );
  }

  const validated = visionResponseSchema.parse(parsed);
  const structuralVector = validated.structuralVector as StructuralVector;
  const pageAnalysis = buildPageAnalysis(
    validated.pageAnalysis,
    validated.semanticVector.trim(),
    structuralVector,
    hint,
  );

  return {
    semanticVector: validated.semanticVector.trim(),
    structuralVector: {
      ...structuralVector,
      analysis: pageAnalysis,
      tags:
        structuralVector.tags.length > 0
          ? structuralVector.tags
          : pageAnalysis.semanticTags,
    },
    quanta: validated.quanta as Quanta[],
    pageAnalysis,
  };
}
