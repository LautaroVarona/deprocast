import "server-only";

import { cohereGenerateJson } from "@/lib/cohere/chat";
import {
  createPendingTask,
  findDuplicateTask,
} from "@/lib/pendientes/store";
import { syncAsaltoMirrorFromTask } from "@/lib/pendientes/asalto-mirror";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

export type QuantomoDraft = {
  titleSugerido: string;
  content: string;
  tagsSemanticos: string[];
  universo?: string;
};

export type SegmentarTextoInput = {
  rawText: string;
  universoDefault?: string;
};

export type SegmentarTextoResult = {
  quantomos: QuantomoDraft[];
};

const SYSTEM = `Sos el Quantador de Deprocast: fragmentás bloques masivos de texto en partículas atómicas de conocimiento ("Quantomos").
Cada Quantomo debe ser independiente, lógico y autocontenido (transcripciones de caminatas, notas manuscritas OCR, diarios largos).

Devolvé SOLO JSON:
{
  "quantomos": [
    {
      "titleSugerido": "título breve imperativo o descriptivo",
      "content": "fragmento atómico de texto",
      "tagsSemanticos": ["tag1", "tag2"],
      "universo": "babel|deprocast|versa|el-fotografo|opcional"
    }
  ]
}

Reglas:
- Máximo 12 quantomos por bloque; priorizá calidad sobre cantidad.
- tagsSemanticos: 1–5 etiquetas semánticas por partícula.
- No dupliques contenido entre quantomos.
- Si el texto es muy corto (<120 chars), devolvé un solo quantomo.
- universo: inferí del contexto si es claro; si no, omití.`;

function fallbackSegment(
  rawText: string,
  universoDefault?: string,
): SegmentarTextoResult {
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 40);

  const chunks = paragraphs.length > 0 ? paragraphs : [rawText.trim()];

  return {
    quantomos: chunks.slice(0, 8).map((content, index) => ({
      titleSugerido:
        content.slice(0, 60).replace(/\s+/g, " ").trim() ||
        `Fragmento ${index + 1}`,
      content,
      tagsSemanticos: ["ingesta", "molecular"],
      universo: universoDefault ?? "babel",
    })),
  };
}

export async function segmentarTexto(
  input: SegmentarTextoInput,
): Promise<SegmentarTextoResult> {
  const trimmed = input.rawText.trim();
  if (!trimmed) {
    return { quantomos: [] };
  }

  if (trimmed.length < 120) {
    return {
      quantomos: [
        {
          titleSugerido: trimmed.slice(0, 60).replace(/\s+/g, " ").trim(),
          content: trimmed,
          tagsSemanticos: ["atomo"],
          universo: input.universoDefault ?? "babel",
        },
      ],
    };
  }

  try {
    const result = await cohereGenerateJson<{
      quantomos?: Array<{
        titleSugerido?: string;
        content?: string;
        tagsSemanticos?: string[];
        universo?: string;
      }>;
    }>({
      systemPrompt: SYSTEM,
      userContent: JSON.stringify({
        rawText: trimmed.slice(0, 12000),
        universoDefault: input.universoDefault ?? "babel",
      }),
      temperature: 0.15,
      maxTokens: 2000,
      throttle: true,
    });

    const quantomos = (result.quantomos ?? [])
      .map((item) => ({
        titleSugerido: item.titleSugerido?.trim() || "",
        content: item.content?.trim() || "",
        tagsSemanticos: Array.isArray(item.tagsSemanticos)
          ? item.tagsSemanticos.map(String).filter(Boolean).slice(0, 5)
          : [],
        universo: item.universo?.trim() || input.universoDefault || "babel",
      }))
      .filter((item) => item.titleSugerido && item.content);

    if (quantomos.length > 0) {
      return { quantomos };
    }
  } catch (error) {
    console.warn("Quantador Cohere fallback:", error);
  }

  return fallbackSegment(trimmed, input.universoDefault);
}

export async function vincularOrigen(
  quantomos: QuantomoDraft[],
  originAttributionId: string,
): Promise<string[]> {
  const ids: string[] = [];

  for (const draft of quantomos) {
    const row = await prisma.quantomo.create({
      data: {
        id: randomUUID(),
        titleSugerido: draft.titleSugerido,
        content: draft.content,
        tagsSemanticos: draft.tagsSemanticos,
        universo: draft.universo ?? "babel",
        originAttributionId,
      },
    });
    ids.push(row.id);
  }

  return ids;
}

export type QuantadorPipelineInput = {
  rawText: string;
  originAttributionId: string;
  universoSlug?: string;
  reviewId?: string;
};

export async function runQuantadorPipeline(
  input: QuantadorPipelineInput,
): Promise<{ quantomoIds: string[]; taskIds: string[] }> {
  const segmented = await segmentarTexto({
    rawText: input.rawText,
    universoDefault: input.universoSlug ?? "babel",
  });

  if (segmented.quantomos.length === 0) {
    return { quantomoIds: [], taskIds: [] };
  }

  const quantomoIds = await vincularOrigen(
    segmented.quantomos,
    input.originAttributionId,
  );

  const taskIds: string[] = [];

  for (const draft of segmented.quantomos) {
    const duplicate = await findDuplicateTask({
      title: draft.titleSugerido,
      sourceRef: input.reviewId,
    });
    if (duplicate) continue;

    const task = await createPendingTask({
      title: draft.titleSugerido,
      description: draft.content.slice(0, 500),
      source: "quantador",
      sourceRef: input.reviewId,
      reviewId: input.reviewId,
      universeSlug: draft.universo ?? input.universoSlug ?? "babel",
      status: "suggested",
      listadorConfidence: 0.55,
    });

    await syncAsaltoMirrorFromTask(task, {
      action: "suggest",
      weight: 6,
    });

    taskIds.push(task.id);
  }

  return { quantomoIds, taskIds };
}

export async function enqueueQuantadorPipeline(
  input: QuantadorPipelineInput,
): Promise<void> {
  void runQuantadorPipeline(input).catch((error) => {
    console.error("Quantador pipeline error:", error);
  });
}
