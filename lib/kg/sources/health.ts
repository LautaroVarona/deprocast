import "server-only";

import { ingestDocumentSource } from "@/lib/kg/sources/common";
import type { SourceIngestSummary } from "@/lib/kg/sources/common";

export type IngestHealthEventInput = {
  eventId: string;
  pillar: string;
  summary: string;
  content: string;
  occurredAt: Date;
  projectEntityIds?: string[];
};

export async function ingestHealthEvent(
  input: IngestHealthEventInput,
): Promise<SourceIngestSummary | null> {
  const body = [
    `Pilar: ${input.pillar}`,
    `Resumen: ${input.summary}`,
    `Registro: ${input.content}`,
    `Fecha: ${input.occurredAt.toISOString()}`,
    input.projectEntityIds?.length
      ? `Proyectos vinculados: ${input.projectEntityIds.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const outcome = await ingestDocumentSource({
    sourceType: "health_event",
    sourceId: input.eventId,
    documentPath: `health/event/${input.eventId}`,
    title: `Salud · ${input.summary}`,
    documentMeta: {
      pillar: input.pillar,
      occurredAt: input.occurredAt.toISOString(),
      projectEntityIds: input.projectEntityIds ?? [],
    },
    body,
    sourceMetadata: {
      pillar: input.pillar,
      projectEntityIds: input.projectEntityIds ?? [],
    },
    connectDocument: true,
  });

  return {
    sourceId: input.eventId,
    title: input.summary,
    skipped: outcome.skipped,
    nodes: outcome.result?.nodeIds.length ?? 0,
    edges: outcome.result?.edgeIds.length ?? 0,
    mentions: outcome.result?.mentionIds.length ?? 0,
  };
}
