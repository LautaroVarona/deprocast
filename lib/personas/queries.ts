import { getCampoLabel } from "@/lib/projects/campos";
import { listProjects } from "@/lib/projects/service";
import {
  parseAliasesJson,
  parseMetadataJson,
} from "@/lib/kg/normalize";
import type { PersonaKind, PersonaMetadata } from "@/lib/kg/types";
import { isPersonaKind } from "@/lib/kg/types";
import { prisma } from "@/lib/prisma";
import { personaSlugFromName } from "@/lib/personas/slug";
import type {
  PersonaActivityItem,
  PersonaCardDto,
  PersonaDetailDto,
  PersonaProjectLink,
} from "@/lib/personas/types";

const PERSONA_PROJECT_RELATIONS = [
  "responsable_de",
  "participa_en",
  "trabaja_en",
  "colabora_con",
  "menciona_a",
  "relacionado_con",
] as const;

const CLOSED_ESTADOS = new Set(["Implantado", "Descartado"]);

const SOURCE_LABELS: Record<string, string> = {
  journal: "Diario",
  chat: "Chat",
  transcript: "Transcripción",
  parent_chunk: "Fragmento de audio",
  audio_asset: "Audio",
  project: "Proyecto",
  raw_document: "Documento",
  code_file: "Código",
  master_plan: "Master plan",
  health_event: "Salud",
};

function extractRole(metadata: Record<string, unknown>): string | null {
  if (typeof metadata.primaryRole === "string" && metadata.primaryRole.trim()) {
    return metadata.primaryRole.trim();
  }
  if (typeof metadata.rol === "string" && metadata.rol.trim()) {
    return metadata.rol.trim();
  }
  const roles = metadata.roles;
  if (Array.isArray(roles) && typeof roles[0] === "string" && roles[0].trim()) {
    return roles[0].trim();
  }
  if (typeof metadata.campoSlug === "string") {
    return getCampoLabel(metadata.campoSlug);
  }
  return null;
}

function extractPersonaKind(metadata: Record<string, unknown>): PersonaKind | null {
  const kind = metadata.personaKind;
  return typeof kind === "string" && isPersonaKind(kind) ? kind : null;
}

function extractCampoSlug(metadata: Record<string, unknown>): string | null {
  return typeof metadata.campoSlug === "string" ? metadata.campoSlug : null;
}

function isProjectOpen(estado: string | null, avance: number | null): boolean {
  if (estado && CLOSED_ESTADOS.has(estado)) return false;
  if (typeof avance === "number" && avance >= 100) return false;
  return true;
}

function resolveProjectState(
  projectNode: { primaryName: string; metadata: unknown },
  fileProjects: Awaited<ReturnType<typeof listProjects>>,
): { estado: string | null; avancePorcentaje: number | null; projectId: string | null } {
  const metadata = parseMetadataJson(projectNode.metadata);
  const projectId =
    typeof metadata.projectId === "string" ? metadata.projectId : null;

  if (projectId) {
    const match = fileProjects.find((project) => project.id === projectId);
    if (match) {
      return {
        estado: match.estado,
        avancePorcentaje: match.avancePorcentaje,
        projectId: match.id,
      };
    }
  }

  const byTitle = fileProjects.find(
    (project) =>
      project.title.trim().toLowerCase() ===
      projectNode.primaryName.trim().toLowerCase(),
  );
  if (byTitle) {
    return {
      estado: byTitle.estado,
      avancePorcentaje: byTitle.avancePorcentaje,
      projectId: byTitle.id,
    };
  }

  return {
    estado: typeof metadata.estado === "string" ? metadata.estado : null,
    avancePorcentaje:
      typeof metadata.avancePorcentaje === "number"
        ? metadata.avancePorcentaje
        : null,
    projectId,
  };
}

function buildSourceHref(sourceType: string, sourceId: string): string | null {
  switch (sourceType) {
    case "journal":
      return `/diario?entry=${encodeURIComponent(sourceId)}`;
    case "chat":
      return `/chat?session=${encodeURIComponent(sourceId)}`;
    case "transcript":
    case "audio_asset":
    case "parent_chunk":
      return `/audio/${encodeURIComponent(sourceId)}`;
    case "project":
      return `/proyectos`;
    default:
      return null;
  }
}

async function buildProjectLinksForPersona(
  personaId: string,
  fileProjects: Awaited<ReturnType<typeof listProjects>>,
): Promise<PersonaProjectLink[]> {
  const edges = await prisma.kgEdge.findMany({
    where: {
      OR: [{ sourceNodeId: personaId }, { targetNodeId: personaId }],
      relationType: { in: [...PERSONA_PROJECT_RELATIONS] },
    },
    include: { sourceNode: true, targetNode: true },
  });

  const links: PersonaProjectLink[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    const isPersonaSource = edge.sourceNodeId === personaId;
    const neighbor = isPersonaSource ? edge.targetNode : edge.sourceNode;
    if (neighbor.type !== "proyecto") continue;
    if (seen.has(neighbor.id)) continue;
    seen.add(neighbor.id);

    const state = resolveProjectState(neighbor, fileProjects);
    links.push({
      nodeId: neighbor.id,
      title: neighbor.primaryName,
      relationType: edge.relationType,
      context: edge.context,
      estado: state.estado,
      avancePorcentaje: state.avancePorcentaje,
      isOpen: isProjectOpen(state.estado, state.avancePorcentaje),
    });
  }

  return links.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

async function getMentionStats(personaIds: string[]) {
  if (personaIds.length === 0) {
    return new Map<string, { count: number; lastAt: Date | null }>();
  }

  const grouped = await prisma.kgMention.groupBy({
    by: ["nodeId"],
    where: { nodeId: { in: personaIds } },
    _count: { nodeId: true },
    _max: { createdAt: true },
  });

  return new Map(
    grouped.map((row) => [
      row.nodeId,
      { count: row._count.nodeId, lastAt: row._max.createdAt },
    ]),
  );
}

export async function listPersonas(): Promise<PersonaCardDto[]> {
  const nodes = await prisma.kgNode.findMany({
    where: { type: "persona" },
    orderBy: { updatedAt: "desc" },
  });

  if (nodes.length === 0) return [];

  const personaIds = nodes.map((node) => node.id);
  const [mentionStats, fileProjects] = await Promise.all([
    getMentionStats(personaIds),
    listProjects(),
  ]);

  const allEdges = await prisma.kgEdge.findMany({
    where: {
      OR: [{ sourceNodeId: { in: personaIds } }, { targetNodeId: { in: personaIds } }],
      relationType: { in: [...PERSONA_PROJECT_RELATIONS] },
    },
    include: { sourceNode: true, targetNode: true },
  });

  const projectsByPersona = new Map<string, { id: string; title: string }[]>();

  for (const edge of allEdges) {
    const personaId =
      edge.sourceNode.type === "persona"
        ? edge.sourceNodeId
        : edge.targetNode.type === "persona"
          ? edge.targetNodeId
          : null;
    const projectNode =
      edge.sourceNode.type === "proyecto"
        ? edge.sourceNode
        : edge.targetNode.type === "proyecto"
          ? edge.targetNode
          : null;

    if (!personaId || !projectNode) continue;

    const list = projectsByPersona.get(personaId) ?? [];
    if (!list.some((item) => item.id === projectNode.id)) {
      list.push({ id: projectNode.id, title: projectNode.primaryName });
    }
    projectsByPersona.set(personaId, list);
  }

  return nodes.map((node) => {
    const metadata = parseMetadataJson(node.metadata) as PersonaMetadata &
      Record<string, unknown>;
    const stats = mentionStats.get(node.id);

    return {
      id: node.id,
      slug: personaSlugFromName(node.primaryName),
      primaryName: node.primaryName,
      aliases: parseAliasesJson(node.aliases),
      personaKind: extractPersonaKind(metadata),
      role: extractRole(metadata),
      campoSlug: extractCampoSlug(metadata),
      confidence: node.confidence,
      lastMentionAt: stats?.lastAt?.toISOString() ?? null,
      mentionCount: stats?.count ?? 0,
      projects: (projectsByPersona.get(node.id) ?? [])
        .filter((project) => {
          const state = resolveProjectState(
            { primaryName: project.title, metadata: {} },
            fileProjects,
          );
          return isProjectOpen(state.estado, state.avancePorcentaje);
        })
        .slice(0, 4),
      updatedAt: node.updatedAt.toISOString(),
    };
  });
}

async function buildActivityFeed(
  personaId: string,
  limit = 80,
): Promise<PersonaActivityItem[]> {
  const [mentions, chatRelations] = await Promise.all([
    prisma.kgMention.findMany({
      where: { nodeId: personaId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.chatContextRelation.findMany({
      where: { entityType: "persona", entityId: personaId },
      include: { message: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const items: PersonaActivityItem[] = [];

  for (const mention of mentions) {
    items.push({
      id: `mention-${mention.id}`,
      kind: "mention",
      occurredAt: mention.createdAt.toISOString(),
      sourceType: mention.sourceType,
      sourceLabel: SOURCE_LABELS[mention.sourceType] ?? mention.sourceType,
      sourceId: mention.sourceId,
      sourceHref: buildSourceHref(mention.sourceType, mention.sourceId),
      fragment: mention.fragment,
      confidence: mention.confidence,
    });
  }

  for (const relation of chatRelations) {
    const message = relation.message;
    items.push({
      id: `chat-${relation.id}`,
      kind: "chat",
      occurredAt: message.createdAt.toISOString(),
      sourceType: "chat",
      sourceLabel: "Chat Exocórtex",
      sourceId: message.sessionId,
      sourceHref: `/chat?session=${encodeURIComponent(message.sessionId)}`,
      fragment:
        message.contentDisplay?.trim() ||
        message.content.trim().slice(0, 280) ||
        "(mensaje sin contenido)",
      confidence: null,
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return items.slice(0, limit);
}

export async function getPersonaByIdOrSlug(
  idOrSlug: string,
): Promise<PersonaDetailDto | null> {
  let node = await prisma.kgNode.findFirst({
    where: { id: idOrSlug, type: "persona" },
  });

  if (!node) {
    const candidates = await prisma.kgNode.findMany({
      where: { type: "persona" },
    });
    node =
      candidates.find(
        (candidate) => personaSlugFromName(candidate.primaryName) === idOrSlug,
      ) ?? null;
  }

  if (!node) return null;

  const metadata = parseMetadataJson(node.metadata) as PersonaMetadata &
    Record<string, unknown>;
  const fileProjects = await listProjects();
  const [mentionStats, projects, activity] = await Promise.all([
    getMentionStats([node.id]),
    buildProjectLinksForPersona(node.id, fileProjects),
    buildActivityFeed(node.id),
  ]);
  const stats = mentionStats.get(node.id);

  return {
    id: node.id,
    slug: personaSlugFromName(node.primaryName),
    primaryName: node.primaryName,
    aliases: parseAliasesJson(node.aliases),
    personaKind: extractPersonaKind(metadata),
    role: extractRole(metadata),
    campoSlug: extractCampoSlug(metadata),
    confidence: node.confidence,
    mentionCount: stats?.count ?? 0,
    lastMentionAt: stats?.lastAt?.toISOString() ?? null,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
    projects,
    openLoops: projects.filter((project) => project.isOpen),
    activity,
  };
}
