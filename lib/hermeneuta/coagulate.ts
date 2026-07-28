import "server-only";

import type {
  HermeneutaCoagulateInput,
  HermeneutaCoagulateResult,
} from "@/lib/hermeneuta/types";
import { ingestDocumentSource } from "@/lib/kg/sources/common";
import type { LlmEntity, LlmKgExtraction, LlmRelation } from "@/lib/kg/types";
import { DEFAULT_KG_EDGE_WEIGHT } from "@/lib/validations/kg-schema";
import { getRawDocumentsPath } from "@/lib/runtime-paths";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Coagulación HITL: solo se llama tras "COAGULAR EN EL GRAFO".
 * - Texto semántico → nodo documento + archivo en raw_documents.
 * - Entidades/aristas → KgNode / KgEdge con weight=6 y reconocido=true.
 */
export async function coagulateHermeneuta(
  input: HermeneutaCoagulateInput,
): Promise<HermeneutaCoagulateResult> {
  const semanticText = input.semanticText.trim();
  if (!semanticText) {
    throw new Error("No hay traducción semántica para coagular.");
  }

  const enabledNodes = input.nodes.filter((n) => n.name.trim());
  if (enabledNodes.length === 0 && !semanticText) {
    throw new Error("Nada que coagular: sin texto ni entidades.");
  }

  const sourceId = `hermeneuta_${randomUUID()}`;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTitle =
    (input.title ?? "").trim() ||
    `Cuaderno ${stamp.slice(0, 10)}`;
  const filename = `hermeneuta_${stamp}.md`;
  const completedDir = getRawDocumentsPath("completed");
  await mkdir(completedDir, { recursive: true });

  const filePath = path.join(completedDir, filename);
  const relativePath = path.posix.join("raw_documents", "completed", filename);

  const markdown = [
    "---",
    `source_type: "hermeneuta"`,
    `title: ${JSON.stringify(safeTitle)}`,
    `extracted_at: ${JSON.stringify(new Date().toISOString())}`,
    `original_filename: ${JSON.stringify(input.originalFilename ?? "")}`,
    `agent: "hermeneuta-cuadernos"`,
    `mapeador: "mapeador-simbolico"`,
    "---",
    "",
    `# ${safeTitle}`,
    "",
    semanticText,
    "",
  ].join("\n");

  await writeFile(filePath, markdown, "utf-8");

  const entities: LlmEntity[] = enabledNodes.map((node) => ({
    name: node.name.trim(),
    type: node.type,
    confidence: 0.85,
    metadata: { source: "hermeneuta", hitlValidated: true },
  }));

  const nodeNameSet = new Set(
    entities.map((e) => e.name.toLowerCase()),
  );

  const relations: LlmRelation[] = input.edges
    .filter((edge) => {
      const from = edge.fromName.trim();
      const to = edge.toName.trim();
      return (
        from &&
        to &&
        nodeNameSet.has(from.toLowerCase()) &&
        nodeNameSet.has(to.toLowerCase())
      );
    })
    .map((edge) => ({
      fromName: edge.fromName.trim(),
      toName: edge.toName.trim(),
      relationType: edge.relationType,
      context: edge.context.trim() || "Validado HITL desde Hermeneuta de Cuadernos.",
      weight: DEFAULT_KG_EDGE_WEIGHT,
      confidence: 0.85,
    }));

  const structured: LlmKgExtraction = { entities, relations };

  const outcome = await ingestDocumentSource({
    sourceType: "hermeneuta",
    sourceId,
    documentPath: relativePath,
    title: safeTitle,
    documentMeta: {
      channel: "hermeneuta",
      originalFilename: input.originalFilename ?? null,
      agent: "hermeneuta-cuadernos",
    },
    body: semanticText,
    structured,
    sourceMetadata: {
      channel: "hermeneuta",
      hitl: true,
    },
    reconocido: true,
    structuredOnly: true,
    connectDocument: true,
    force: true,
  });

  // Forzar HITL: nodos reconocidos; aristas del mapeador con weight=6.
  // Las menciona_a del documento se marcan reconocidas (peso documental 3).
  const { prisma } = await import("@/lib/prisma");
  const nodeIds = outcome.result?.nodeIds ?? [];
  const edgeIds = outcome.result?.edgeIds ?? [];

  if (nodeIds.length) {
    await prisma.kgNode.updateMany({
      where: { id: { in: nodeIds } },
      data: { reconocido: true },
    });
  }

  if (edgeIds.length) {
    await prisma.kgEdge.updateMany({
      where: {
        id: { in: edgeIds },
        relationType: { not: "menciona_a" },
      },
      data: {
        weight: DEFAULT_KG_EDGE_WEIGHT,
        reconocido: true,
      },
    });
  }

  const docNode = await prisma.kgNode.findUnique({
    where: {
      primaryName_type: { primaryName: relativePath, type: "documento" },
    },
    select: { id: true },
  });

  if (docNode) {
    await prisma.kgEdge.updateMany({
      where: {
        sourceNodeId: docNode.id,
        relationType: "menciona_a",
      },
      data: { reconocido: true },
    });
  }

  return {
    documentPath: relativePath,
    sourceId,
    nodeIds: outcome.result?.nodeIds ?? [],
    edgeIds: outcome.result?.edgeIds ?? [],
    skipped: outcome.skipped,
  };
}
