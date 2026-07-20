import "server-only";

import type { ContextBlock, ResolvedMention } from "@/lib/chat/types";
import { getEntityTypeLabel } from "@/lib/chat/mention-index";
import { hybridHitsToBlocks, hybridSearch } from "@/lib/chat/hybrid-search";
import { buildContextBlock, truncateContextBlocks } from "@/lib/chat/prompts";
import { getNeighborhood } from "@/lib/kg/queries";
import { listLaboralChallenges } from "@/lib/laboral/challenges";
import { getCampoLabel } from "@/lib/projects/campos";
import { findProjectById, listProjects } from "@/lib/projects/service";

async function findLaboralChallengeById(id: string) {
  const challenges = await listLaboralChallenges();
  return challenges.find((challenge) => challenge.id === id) ?? null;
}

function formatProjectBlock(
  project: Awaited<ReturnType<typeof findProjectById>>,
  label: string,
): ContextBlock | null {
  if (!project) return null;

  const progress = project.progressEntries
    .slice(-5)
    .map((entry) => `- ${entry.fecha}: ${entry.nota}`)
    .join("\n");

  const body = [
    `Título: ${project.title}`,
    `Campo: ${project.campo}`,
    `Estado: ${project.estado}`,
    `Responsable: ${project.responsable || "—"}`,
    `Prioridad/Impacto/Dificultad: ${project.prioridad}/${project.impacto}/${project.dificultad}`,
    `Avance: ${project.avancePorcentaje}%`,
    project.description ? `Descripción: ${project.description}` : null,
    progress ? `Últimos logs:\n${progress}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: `${label}: ${project.title}`,
    body,
    priority: 100,
  };
}

async function buildPersonaBlock(
  mention: ResolvedMention,
): Promise<ContextBlock | null> {
  const neighborhood = await getNeighborhood(mention.entityId);
  if (!neighborhood) return null;

  const edges = neighborhood.edges
    .slice(0, 8)
    .map(
      (edge) =>
        `- [${edge.relationType}] ${edge.neighbor.primaryName}: ${edge.context}`,
    )
    .join("\n");

  const mentions = neighborhood.mentions
    .slice(0, 6)
    .map((item) => `- "${item.fragment}" (${item.sourceType})`)
    .join("\n");

  const body = [
    `Nombre: ${neighborhood.node.primaryName}`,
    neighborhood.node.aliases.length
      ? `Alias: ${neighborhood.node.aliases.join(", ")}`
      : null,
    edges ? `Relaciones recientes:\n${edges}` : null,
    mentions ? `Menciones en fuentes:\n${mentions}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: `Persona: ${mention.label}`,
    body,
    priority: 95,
  };
}

async function buildCampoBlock(
  mention: ResolvedMention,
): Promise<ContextBlock | null> {
  const projects = await listProjects();
  const campoProjects = projects
    .filter((project) => project.campoSlug === mention.entityId)
    .sort((a, b) => b.prioridad - a.prioridad)
    .slice(0, 10);

  const lines = campoProjects.map(
    (project) =>
      `- ${project.title} (${project.estado}, prioridad ${project.prioridad})`,
  );

  return {
    title: `Campo: ${getCampoLabel(mention.entityId)}`,
    body: [
      `Slug: ${mention.entityId}`,
      lines.length
        ? `Proyectos activos:\n${lines.join("\n")}`
        : "Sin proyectos en este campo.",
    ].join("\n"),
    priority: 85,
  };
}

async function buildLaboralBlock(
  mention: ResolvedMention,
): Promise<ContextBlock | null> {
  const challenge = await findLaboralChallengeById(mention.entityId);
  if (!challenge) return null;

  const body = [
    `Título: ${challenge.title}`,
    `Área: ${challenge.onda}`,
    `Responsable: ${challenge.responsable}`,
    `Estado: ${challenge.estado}`,
    `Avance: ${challenge.avancePorcentaje ?? 0}%`,
    challenge.observaciones
      ? `Observaciones: ${challenge.observaciones}`
      : null,
    challenge.puntosMejora
      ? `Puntos de mejora: ${challenge.puntosMejora}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: `Reto laboral: ${challenge.title}`,
    body,
    priority: 90,
  };
}

async function buildMentionBlock(
  mention: ResolvedMention,
): Promise<ContextBlock | null> {
  switch (mention.entityType) {
    case "proyecto":
      return formatProjectBlock(
        await findProjectById(mention.entityId),
        "Proyecto",
      );
    case "reto":
    case "area":
      return formatProjectBlock(
        await findProjectById(mention.entityId),
        getEntityTypeLabel(mention.entityType),
      );
    case "persona":
      return buildPersonaBlock(mention);
    case "campo":
      return buildCampoBlock(mention);
    case "laboral_reto":
      return buildLaboralBlock(mention);
    default:
      return null;
  }
}

export async function buildChatContext(
  mentions: ResolvedMention[],
  userQuery: string,
): Promise<string> {
  const blocks: ContextBlock[] = [];

  const personaNodeIds = mentions
    .filter((mention) => mention.entityType === "persona")
    .map((mention) => mention.entityId);

  const plainQuery = userQuery.replace(/@\S+/g, "").trim();

  try {
    const { buildRecallPath } = await import("@/lib/memory/recall-path");
    const recall = await buildRecallPath({
      query: plainQuery || userQuery,
      mentionedNodeIds: personaNodeIds,
    });
    if (recall.text.trim()) {
      blocks.push({
        title: "Recall path (bajo costo)",
        body: recall.text,
        priority: 120,
      });
    }
  } catch (error) {
    console.warn("Recall path skip:", error);
  }

  for (const mention of mentions) {
    const block = await buildMentionBlock(mention);
    if (block) blocks.push(block);
  }

  if (plainQuery) {
    const hits = await hybridSearch({
      query: plainQuery,
      mentionedNodeIds: personaNodeIds,
      limit: 8,
    });
    blocks.push(...hybridHitsToBlocks(hits));
  }

  const truncated = truncateContextBlocks(blocks);
  return buildContextBlock(truncated);
}
