import { prisma } from "@/lib/prisma";
import { extractKgFromText } from "@/lib/kg/extract";
import { ingestKgExtraction } from "@/lib/kg/ingest";
import { ingestIfChanged, type IngestIfChangedResult } from "@/lib/kg/incremental";
import type {
  LlmEntity,
  LlmKgExtraction,
  MentionSourceType,
} from "@/lib/kg/types";

export type SourceIngestSummary = {
  sourceId: string;
  title: string;
  skipped: boolean;
  nodes: number;
  edges: number;
  mentions: number;
};

export type IngestDocumentParams = {
  sourceType: MentionSourceType;
  /** Id estable de la fuente para menciones e incrementalidad. */
  sourceId: string;
  /** Nombre canonico del nodo `documento` (normalmente la ruta relativa). */
  documentPath: string;
  title: string;
  documentMeta?: Record<string, unknown>;
  body: string;
  /** Extraccion estructurada deterministica (frontmatter, relaciones fijas). */
  structured?: LlmKgExtraction;
  sourceMetadata?: Record<string, unknown>;
  model?: string;
  force?: boolean;
  /** Conectar el nodo documento con las entidades halladas (default true). */
  connectDocument?: boolean;
  confidence?: number;
};

/**
 * Ingesta unificada de una fuente documental:
 * - Crea/actualiza un nodo `documento` canonico.
 * - Extrae entidades y relaciones del cuerpo via LLM (Vertex).
 * - Fusiona con la extraccion estructurada provista.
 * - Conecta el documento con las entidades (menciona_a).
 * - Todo envuelto en ingesta incremental (hash de contenido).
 */
export async function ingestDocumentSource(
  params: IngestDocumentParams,
): Promise<IngestIfChangedResult> {
  const {
    sourceType,
    sourceId,
    documentPath,
    title,
    documentMeta = {},
    body,
    structured,
    sourceMetadata = {},
    model,
    force,
    connectDocument = true,
    confidence,
  } = params;

  const signatureBasis = JSON.stringify({
    body,
    structured: structured ?? null,
    title,
  });

  return ingestIfChanged(
    { sourceType, sourceId },
    signatureBasis,
    async () => {
      const llm = body.trim()
        ? await extractKgFromText(body, model)
        : { entities: [], relations: [] };

      const docEntity: LlmEntity = {
        name: documentPath,
        type: "documento",
        aliases: title && title !== documentPath ? [title] : [],
        metadata: { ...documentMeta, title },
        confidence: 0.9,
      };

      const merged: LlmKgExtraction = {
        entities: [docEntity, ...(structured?.entities ?? []), ...llm.entities],
        relations: [...(structured?.relations ?? []), ...llm.relations],
      };

      const result = await ingestKgExtraction({
        extraction: merged,
        source: {
          type: sourceType,
          id: sourceId,
          metadata: sourceMetadata,
          confidence,
        },
      });

      if (connectDocument) {
        const docNode = await prisma.kgNode.findUnique({
          where: {
            primaryName_type: { primaryName: documentPath, type: "documento" },
          },
        });

        if (docNode) {
          for (const nodeId of result.nodeIds) {
            if (nodeId === docNode.id) continue;
            await prisma.kgEdge.upsert({
              where: {
                sourceNodeId_targetNodeId_relationType: {
                  sourceNodeId: docNode.id,
                  targetNodeId: nodeId,
                  relationType: "menciona_a",
                },
              },
              create: {
                sourceNodeId: docNode.id,
                targetNodeId: nodeId,
                relationType: "menciona_a",
                context: `El documento "${title}" menciona esta entidad.`,
                weight: 3,
                confidence: 0.6,
                metadata: { kind: "document-mention" },
              },
              update: {},
            });
          }
        }
      }

      return result;
    },
    { force, metadata: { title, sourceType, ...documentMeta } },
  );
}
