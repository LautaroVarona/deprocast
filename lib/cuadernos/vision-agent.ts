import { cohereChatWithImages } from "@/lib/cohere/vision";
import type { Quanta, StructuralVector, VisionAgentResult } from "@/lib/cuadernos/types";
import { z } from "zod";

export const ATOMIC_VISION_PROMPT = `Actúas como un Agente de Visión Atómica para cuadernos físicos manuscritos.

Tu tarea es realizar un "OCR Sintáctico y Esotérico" sobre la imagen de una sola página:

1. VECTOR SEMÁNTICO (semanticVector): Transcribe el texto manuscrito de forma LITERAL al español. Conserva tachones como ~~texto~~. No inventes contenido.

2. VECTOR ESTRUCTURAL (structuralVector): Detecta diagramas, flechas, símbolos, runas o estructuras geométricas. Incluye tags temáticos, proyectos asociados si aparecen, y un mapa de relaciones visuales.

3. QUÁNTOMOS (quanta): Fragmentos atómicos de texto detectados con su caja delimitadora normalizada (0-1 respecto al ancho/alto de la imagen).

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
  "quanta": [{ "id": "q1", "text": "string", "bbox": { "x": 0.1, "y": 0.2, "w": 0.3, "h": 0.05 }, "confidence": 0.9 }]
}`;

const bboxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
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

export async function runAtomicVisionAgent(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<VisionAgentResult> {
  const base64 = input.buffer.toString("base64");

  const raw = stripJsonFences(
    await cohereChatWithImages({
      systemPrompt: ATOMIC_VISION_PROMPT,
      images: [{ base64, mimeType: input.mimeType }],
      userText:
        "Analiza esta página de cuaderno y devuelve el JSON con semanticVector, structuralVector y quanta.",
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

  return {
    semanticVector: validated.semanticVector.trim(),
    structuralVector: validated.structuralVector as StructuralVector,
    quanta: validated.quanta as Quanta[],
  };
}
