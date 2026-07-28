import "server-only";

import { getCohereModelName } from "@/lib/cohere/config";
import { cohereChatWithImages } from "@/lib/cohere/vision";
import {
  HERMENEUTA_SYSTEM_PROMPT,
  HERMENEUTA_USER_TEXT,
  MAPEADOR_SYSTEM_PROMPT,
  MAPEADOR_USER_TEXT,
} from "@/lib/hermeneuta/prompts";
import type {
  HermeneutaExtractResult,
  StructuralEdgeProposal,
  StructuralNodeProposal,
} from "@/lib/hermeneuta/types";
import { mapLegacyEntityType } from "@/lib/kg/normalize";
import {
  isRelationType,
  type RelationType,
} from "@/lib/kg/types";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";

const SUPPORTED_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
};

const mapeadorSchema = z.object({
  nodes: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .default([]),
  edges: z
    .array(
      z.object({
        fromName: z.string(),
        toName: z.string(),
        relationType: z.string(),
        context: z.string().optional(),
      }),
    )
    .default([]),
});

function resolveMimeType(filename: string, fallback?: string | null): string {
  const ext = path.extname(filename).toLowerCase();
  if (SUPPORTED_MIME[ext]) return SUPPORTED_MIME[ext];
  if (fallback && fallback.startsWith("image/")) return fallback;
  throw new Error(
    "Formato no soportado. Usá imágenes (.png, .jpg, .webp, .gif, .heic).",
  );
}

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

function normalizeRelationType(raw: string): RelationType {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (isRelationType(key)) return key;
  const aliases: Record<string, RelationType> = {
    depends_on: "depende_de",
    depende: "depende_de",
    related_to: "relacionado_con",
    related: "relacionado_con",
    mentions: "menciona_a",
    belongs_to: "pertenece_a",
    works_on: "trabaja_en",
    defines: "define",
  };
  return aliases[key] ?? "relacionado_con";
}

function parseMapeadorJson(raw: string): {
  nodes: StructuralNodeProposal[];
  edges: StructuralEdgeProposal[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(raw));
  } catch {
    return { nodes: [], edges: [] };
  }

  const validated = mapeadorSchema.safeParse(parsed);
  if (!validated.success) {
    return { nodes: [], edges: [] };
  }

  const nodes: StructuralNodeProposal[] = validated.data.nodes
    .map((node) => {
      const name = node.name.trim();
      if (!name) return null;
      return {
        localId: randomUUID(),
        name,
        type: mapLegacyEntityType(node.type),
        confidence: node.confidence,
      } satisfies StructuralNodeProposal;
    })
    .filter((n): n is StructuralNodeProposal => n !== null);

  const knownNames = new Set(nodes.map((n) => n.name.toLowerCase()));

  const edges: StructuralEdgeProposal[] = validated.data.edges
    .map((edge) => {
      const fromName = edge.fromName.trim();
      const toName = edge.toName.trim();
      if (!fromName || !toName) return null;
      if (
        !knownNames.has(fromName.toLowerCase()) ||
        !knownNames.has(toName.toLowerCase())
      ) {
        // Permitir aristas si los nombres están presentes aunque el casing difiera
        const hasFrom = nodes.some(
          (n) => n.name.toLowerCase() === fromName.toLowerCase(),
        );
        const hasTo = nodes.some(
          (n) => n.name.toLowerCase() === toName.toLowerCase(),
        );
        if (!hasFrom || !hasTo) return null;
      }
      return {
        localId: randomUUID(),
        fromName,
        toName,
        relationType: normalizeRelationType(edge.relationType),
        context:
          (edge.context ?? "").trim() ||
          `Relación visual detectada: ${fromName} → ${toName}`,
      } satisfies StructuralEdgeProposal;
    })
    .filter((e): e is StructuralEdgeProposal => e !== null);

  return { nodes, edges };
}

/**
 * Pipeline Atanor Visual: Vector Semántico + Vector Estructural.
 * No escribe en SQLite — solo propone materia prima para HITL.
 */
export async function extractHermeneutaFromImage(input: {
  buffer: Buffer;
  originalFilename: string;
  mimeType?: string | null;
}): Promise<HermeneutaExtractResult> {
  const mimeType = resolveMimeType(input.originalFilename, input.mimeType);
  const base64 = input.buffer.toString("base64");
  const images = [{ base64, mimeType }];
  const modelUsed = getCohereModelName("vision");

  const [semanticRaw, structuralRaw] = await Promise.all([
    cohereChatWithImages({
      systemPrompt: HERMENEUTA_SYSTEM_PROMPT,
      images,
      userText: HERMENEUTA_USER_TEXT,
      temperature: 0.1,
      maxTokens: 4096,
    }),
    cohereChatWithImages({
      systemPrompt: MAPEADOR_SYSTEM_PROMPT,
      images,
      userText: MAPEADOR_USER_TEXT,
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 4096,
    }),
  ]);

  const { nodes, edges } = parseMapeadorJson(structuralRaw);

  return {
    semanticText: semanticRaw.trim(),
    structuralNodes: nodes,
    structuralEdges: edges,
    mimeType,
    originalFilename: input.originalFilename,
    modelUsed,
  };
}
