import "server-only";

import { cohereGenerateJson } from "@/lib/cohere/chat";
import { conceptToSlug, normalizeConcept } from "@/lib/enciclopedia/slug";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

export type MultiVectorResult = {
  actionTitles: string[];
  entityCandidateIds: string[];
  encyclopediaEntryIds: string[];
};

type MultiVectorLlm = {
  actions?: Array<{ title?: string; description?: string }>;
  entities?: Array<{
    name?: string;
    type?: string;
    contextSnippet?: string;
  }>;
  concepts?: Array<{ title?: string; thesis?: string }>;
};

const SYSTEM = `Sos el extractor multi-vectorial de Deprocast (Estación VECTORS).
Dado un conjunto de Quántomos (micro-ideas), clasificá en 3 vectores atómicos.

Devolvé SOLO JSON:
{
  "actions": [{ "title": "tarea imperativa corta", "description": "contexto" }],
  "entities": [{ "name": "Persona u Org", "type": "PERSON|ORGANIZATION", "contextSnippet": "frase exacta del texto" }],
  "concepts": [{ "title": "tesis/arquetipo", "thesis": "definición breve filosofía pura" }]
}

Reglas:
- Máximo 6 actions, 8 entities, 5 concepts.
- contextSnippet debe ser literal o casi literal del input.
- type solo PERSON u ORGANIZATION.
- No inventes entidades sin ancla textual.`;

/**
 * Vector A/B/C post-Quantador. No coagula al KG (HITL pendiente).
 * Vector A (acciones) ya suele crearse en Quantador; aquí refuerza entidades + enciclopedia.
 */
export async function extractMultiVectors(input: {
  rawText: string;
  quantomoIds: string[];
  assetId: string;
  universoSlug?: string;
}): Promise<MultiVectorResult> {
  const quantomos = await prisma.quantomo.findMany({
    where: { id: { in: input.quantomoIds } },
    select: { id: true, titleSugerido: true, content: true },
  });

  const corpus =
    quantomos.length > 0
      ? quantomos
          .map((q) => `## ${q.titleSugerido}\n${q.content}`)
          .join("\n\n")
      : input.rawText;

  let parsed: MultiVectorLlm = {};
  try {
    parsed = await cohereGenerateJson<MultiVectorLlm>({
      systemPrompt: SYSTEM,
      userContent: JSON.stringify({
        text: corpus.slice(0, 10000),
        universo: input.universoSlug ?? "babel",
      }),
      temperature: 0.1,
      maxTokens: 1800,
      throttle: true,
    });
  } catch (error) {
    console.warn("Multi-vector LLM fallback:", error);
  }

  const actionTitles: string[] = [];
  for (const action of parsed.actions ?? []) {
    const title = action.title?.trim();
    if (!title) continue;
    actionTitles.push(title);
  }

  const entityCandidateIds: string[] = [];
  for (const entity of parsed.entities ?? []) {
    const name = entity.name?.trim();
    const snippet = entity.contextSnippet?.trim();
    if (!name || !snippet) continue;

    const typeRaw = (entity.type ?? "PERSON").toUpperCase();
    const type =
      typeRaw === "ORGANIZATION" || typeRaw === "ORG" || typeRaw === "PROJECT"
        ? typeRaw === "PROJECT"
          ? "PROJECT"
          : "ORGANIZATION"
        : "PERSON";

    const existing = await prisma.entityCandidate.findFirst({
      where: {
        name: { equals: name },
        status: "PENDING",
        sourceId: input.assetId,
      },
      select: { id: true },
    });
    if (existing) {
      entityCandidateIds.push(existing.id);
      continue;
    }

    const row = await prisma.entityCandidate.create({
      data: {
        id: randomUUID(),
        name,
        type: type === "ORGANIZATION" ? "PROJECT" : type,
        contextSnippet: snippet.slice(0, 500),
        sourceId: input.assetId,
        status: "PENDING",
        metadata: {
          assetId: input.assetId,
          vector: "B",
          universo: input.universoSlug ?? "babel",
        },
      },
    });
    entityCandidateIds.push(row.id);
  }

  const encyclopediaEntryIds: string[] = [];
  for (const concept of parsed.concepts ?? []) {
    const title = normalizeConcept(concept.title ?? "");
    const thesis = concept.thesis?.trim() ?? "";
    if (title.length < 2 || !thesis) continue;

    const slugBase = conceptToSlug(title);
    if (!slugBase) continue;
    const slug = `${slugBase}-draft-${input.assetId.slice(0, 8)}`;

    const existing = await prisma.encyclopediaEntry.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      encyclopediaEntryIds.push(existing.id);
      continue;
    }

    const entry = await prisma.encyclopediaEntry.create({
      data: {
        id: randomUUID(),
        slug,
        title,
        body: thesis,
        explorableTerms: [],
        model: "audio-vector-c",
        validatedCount: 0,
        triggerTerm: title,
      },
    });
    encyclopediaEntryIds.push(entry.id);
  }

  return { actionTitles, entityCandidateIds, encyclopediaEntryIds };
}
