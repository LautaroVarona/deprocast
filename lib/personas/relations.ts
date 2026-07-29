import { parseMetadataJson } from "@/lib/kg/normalize";
import { searchNodes } from "@/lib/kg/queries";
import {
  buildEdgeMetadata,
  kgEdgeToRelacionPersonaCampo,
  kgEdgeToRelacionPersonaPersona,
  kgEdgeToRelacionPersonaProyecto,
} from "@/lib/personas/mappers";
import type {
  CreateRelacionPersonaCampoPayload,
  CreateRelacionPersonaPersonaPayload,
  CreateRelacionPersonaProyectoPayload,
  PersonaLinkTarget,
  PersonaLinkTargetKind,
  PersonaRelationListItem,
  RelacionPersonaCampo,
  RelacionPersonaPersona,
  RelacionPersonaProyecto,
  UpdateRelacionPayload,
} from "@/lib/personas/model";
import { getCampoLabel, isCampoSlug } from "@/lib/projects/campos";
import {
  findProjectById,
  listCampos,
  listProjects,
} from "@/lib/projects/service";
import type { Project } from "@/lib/projects/types";
import { prisma } from "@/lib/prisma";
import { Prisma, type KgEdge, type KgNode } from "@prisma/client";

/**
 * Resuelve o rehidrata un nodo persona.
 * Si el id no está en SQLite (cold start / caché cliente) pero llega el nombre,
 * recrea el nodo con el mismo id para que los vínculos sigan funcionando.
 */
async function ensurePersonaNode(id: string, nombrePrincipal?: string) {
  const existing = await prisma.kgNode.findFirst({
    where: { id, type: "persona" },
  });
  if (existing) return existing;

  const name = nombrePrincipal?.trim();
  if (!name) throw new Error("Persona no encontrada.");

  const byName = await prisma.kgNode.findUnique({
    where: { primaryName_type: { primaryName: name, type: "persona" } },
  });
  if (byName) return byName;

  return prisma.kgNode.create({
    data: {
      id,
      primaryName: name,
      type: "persona",
      aliases: [],
      metadata: {
        rehydrated: true,
        source: "persona-relations",
      } as Prisma.InputJsonValue,
      confidence: 0.7,
      reconocido: true,
    },
  });
}

async function findProyectoNodeForProject(
  project: Project,
): Promise<KgNode | null> {
  const byName = await prisma.kgNode.findUnique({
    where: {
      primaryName_type: {
        primaryName: project.title,
        type: "proyecto",
      },
    },
  });
  if (byName) {
    const meta = parseMetadataJson(byName.metadata);
    if (!meta.projectId || meta.projectId === project.id) {
      if (meta.projectId !== project.id) {
        return prisma.kgNode.update({
          where: { id: byName.id },
          data: {
            metadata: {
              ...meta,
              projectId: project.id,
              campoSlug: project.campoSlug,
              estado: project.estado,
            } as Prisma.InputJsonValue,
          },
        });
      }
      return byName;
    }
  }

  const candidates = await prisma.kgNode.findMany({
    where: { type: "proyecto" },
  });
  for (const node of candidates) {
    const meta = parseMetadataJson(node.metadata);
    if (meta.projectId === project.id) return node;
  }
  return null;
}

/** Resuelve KgNode proyecto desde id de grafo o id de archivo Atanor. */
async function ensureProyectoNode(idOrRef: string): Promise<KgNode> {
  const byId = await prisma.kgNode.findFirst({
    where: { id: idOrRef, type: "proyecto" },
  });
  if (byId) return byId;

  const project = await findProjectById(idOrRef);
  if (project) {
    const existing = await findProyectoNodeForProject(project);
    if (existing) return existing;

    try {
      const { ingestSingleProject } = await import("@/lib/kg/sources/projects");
      await ingestSingleProject(project, {
        reconocido: true,
        structuredOnly: true,
        force: true,
      });
    } catch (error) {
      console.error("ensureProyectoNode ingest error:", error);
    }

    const afterIngest = await findProyectoNodeForProject(project);
    if (afterIngest) return afterIngest;

    return prisma.kgNode.create({
      data: {
        primaryName: project.title,
        type: "proyecto",
        aliases: [],
        metadata: {
          projectId: project.id,
          campoSlug: project.campoSlug,
          estado: project.estado,
        } as Prisma.InputJsonValue,
        confidence: 0.9,
        reconocido: true,
      },
    });
  }

  const byName = await prisma.kgNode.findUnique({
    where: {
      primaryName_type: { primaryName: idOrRef, type: "proyecto" },
    },
  });
  if (byName) return byName;

  throw new Error("Proyecto no encontrado en el Atanor ni en el grafo.");
}

async function assertCampoSlug(slug: string) {
  if (!isCampoSlug(slug)) throw new Error("Slug de campo inválido.");
}

async function ensureCampoConceptoNode(campoSlug: string): Promise<KgNode> {
  await assertCampoSlug(campoSlug);
  const label = getCampoLabel(campoSlug);

  const conceptos = await prisma.kgNode.findMany({ where: { type: "concepto" } });
  const bySlug = conceptos.find((node) => {
    const metadata = parseMetadataJson(node.metadata);
    return metadata.campoSlug === campoSlug;
  });
  if (bySlug) return bySlug;

  const byName = await prisma.kgNode.findFirst({
    where: { primaryName: label, type: "concepto" },
  });
  if (byName) {
    const metadata = {
      ...parseMetadataJson(byName.metadata),
      campoSlug,
      rol: "campo",
    };
    return prisma.kgNode.update({
      where: { id: byName.id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  return prisma.kgNode.create({
    data: {
      primaryName: label,
      type: "concepto",
      aliases: [],
      metadata: { campoSlug, rol: "campo" } as Prisma.InputJsonValue,
      confidence: 0.8,
    },
  });
}

function edgeToRelationListItem(
  edge: KgEdge & { sourceNode: KgNode; targetNode: KgNode },
  personaId: string,
): PersonaRelationListItem | null {
  const personaPersona = kgEdgeToRelacionPersonaPersona(
    edge,
    edge.sourceNode,
    edge.targetNode,
  );
  if (personaPersona) {
    const isOutgoing = personaPersona.origenId === personaId;
    const otherId = isOutgoing ? personaPersona.destinoId : personaPersona.origenId;
    const other =
      edge.sourceNode.id === otherId ? edge.sourceNode : edge.targetNode;
    return {
      id: edge.id,
      kind: "persona",
      label: other.primaryName,
      relationType: personaPersona.tipoRelacion,
      rolPrincipal: null,
      contexto: personaPersona.contexto,
      targetId: otherId,
      campoSlug: null,
    };
  }

  const personaProyecto = kgEdgeToRelacionPersonaProyecto(
    edge,
    edge.sourceNode,
    edge.targetNode,
  );
  if (personaProyecto) {
    const projectNode =
      edge.sourceNode.type === "proyecto" ? edge.sourceNode : edge.targetNode;
    return {
      id: edge.id,
      kind: "proyecto",
      label: projectNode.primaryName,
      relationType: personaProyecto.rolPrincipal,
      rolPrincipal: personaProyecto.rolPrincipal,
      contexto: personaProyecto.contexto,
      targetId: projectNode.id,
      campoSlug: null,
    };
  }

  const personaCampo = kgEdgeToRelacionPersonaCampo(
    edge,
    edge.sourceNode,
    edge.targetNode,
  );
  if (personaCampo) {
    const campoNode =
      edge.sourceNode.id === personaCampo.campoNodeId
        ? edge.sourceNode
        : edge.targetNode;
    return {
      id: edge.id,
      kind: "campo",
      label: campoNode.primaryName,
      relationType: edge.relationType,
      rolPrincipal: null,
      contexto: personaCampo.contexto,
      targetId: campoNode.id,
      campoSlug: personaCampo.campoSlug,
    };
  }

  return null;
}

export async function listPersonaRelations(
  personaId: string,
  nombrePrincipal?: string,
): Promise<PersonaRelationListItem[]> {
  await ensurePersonaNode(personaId, nombrePrincipal);

  const edges = await prisma.kgEdge.findMany({
    where: {
      OR: [{ sourceNodeId: personaId }, { targetNodeId: personaId }],
    },
    include: { sourceNode: true, targetNode: true },
  });

  const items: PersonaRelationListItem[] = [];
  for (const edge of edges) {
    const item = edgeToRelationListItem(edge, personaId);
    if (item) items.push(item);
  }

  return items.sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export async function listPersonaLinkTargets(input: {
  kind: PersonaLinkTargetKind;
  q?: string;
  excludePersonaId?: string;
}): Promise<PersonaLinkTarget[]> {
  const query = input.q?.trim() ?? "";

  if (input.kind === "persona") {
    const nodes = await searchNodes({ type: "persona", q: query, limit: 40 });
    return nodes
      .filter((node) => node.id !== input.excludePersonaId)
      .map((node) => ({
        id: node.id,
        kind: "persona" as const,
        label: node.primaryName,
        sublabel: node.aliases.length ? node.aliases.join(", ") : null,
        campoSlug: null,
      }));
  }

  if (input.kind === "proyecto") {
    const [nodes, fileProjects, proyectoNodes] = await Promise.all([
      searchNodes({ type: "proyecto", q: query, limit: 80 }),
      listProjects(),
      prisma.kgNode.findMany({ where: { type: "proyecto" } }),
    ]);

    const fileIdToNodeId = new Map<string, string>();
    const titleToNodeId = new Map<string, string>();
    for (const node of proyectoNodes) {
      titleToNodeId.set(node.primaryName.toLowerCase(), node.id);
      const meta = parseMetadataJson(node.metadata);
      if (typeof meta.projectId === "string") {
        fileIdToNodeId.set(meta.projectId, node.id);
      }
    }

    const byId = new Map<string, PersonaLinkTarget>();

    for (const node of nodes) {
      byId.set(node.id, {
        id: node.id,
        kind: "proyecto",
        label: node.primaryName,
        sublabel:
          typeof node.metadata.estado === "string"
            ? node.metadata.estado
            : typeof node.metadata.projectId === "string"
              ? node.metadata.projectId
              : null,
        campoSlug:
          typeof node.metadata.campoSlug === "string"
            ? node.metadata.campoSlug
            : null,
      });
    }

    const queryLower = query.toLowerCase();
    for (const project of fileProjects) {
      if (
        query &&
        !`${project.title} ${project.id} ${project.campoSlug}`
          .toLowerCase()
          .includes(queryLower)
      ) {
        continue;
      }

      const targetId =
        fileIdToNodeId.get(project.id) ??
        titleToNodeId.get(project.title.toLowerCase()) ??
        project.id;
      if (byId.has(targetId)) continue;

      byId.set(targetId, {
        id: targetId,
        kind: "proyecto",
        label: project.title,
        sublabel: project.estado || project.campoSlug,
        campoSlug: project.campoSlug,
      });
    }

    return [...byId.values()]
      .sort((a, b) => a.label.localeCompare(b.label, "es"))
      .slice(0, 40);
  }

  const campos = await listCampos();
  const conceptos = await prisma.kgNode.findMany({ where: { type: "concepto" } });
  const slugToNodeId = new Map<string, string>();

  for (const node of conceptos) {
    const metadata = parseMetadataJson(node.metadata);
    if (typeof metadata.campoSlug === "string") {
      slugToNodeId.set(metadata.campoSlug, node.id);
    }
  }

  return campos
    .filter((campo) => {
      if (!query) return true;
      const haystack = `${campo.label} ${campo.slug}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    })
    .map((campo) => ({
      id: slugToNodeId.get(campo.slug) ?? campo.slug,
      kind: "campo" as const,
      label: campo.label,
      sublabel: campo.slug,
      campoSlug: campo.slug,
    }));
}

export async function createRelacionPersonaPersona(
  input: CreateRelacionPersonaPersonaPayload & {
    origenNombre?: string;
    destinoNombre?: string;
  },
): Promise<RelacionPersonaPersona> {
  if (input.origenId === input.destinoId) {
    throw new Error("Una persona no puede relacionarse consigo misma.");
  }

  const origen = await ensurePersonaNode(input.origenId, input.origenNombre);
  const destino = await ensurePersonaNode(input.destinoId, input.destinoNombre);

  const tipoRelacion = input.tipoRelacion.trim();
  if (!tipoRelacion) throw new Error("El tipo de relación es obligatorio.");

  const edge = await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: origen.id,
        targetNodeId: destino.id,
        relationType: tipoRelacion,
      },
    },
    create: {
      sourceNodeId: origen.id,
      targetNodeId: destino.id,
      relationType: tipoRelacion,
      context: input.contexto?.trim() ?? "",
      metadata: {},
      reconocido: true,
    },
    update: {
      context: input.contexto?.trim() ?? "",
      reconocido: true,
    },
    include: { sourceNode: true, targetNode: true },
  });

  const relation = kgEdgeToRelacionPersonaPersona(
    edge,
    edge.sourceNode,
    edge.targetNode,
  );
  if (!relation) throw new Error("No se pudo materializar la relación.");
  return relation;
}

export async function createRelacionPersonaProyecto(
  input: CreateRelacionPersonaProyectoPayload & { personaNombre?: string },
): Promise<RelacionPersonaProyecto> {
  const persona = await ensurePersonaNode(input.personaId, input.personaNombre);
  const proyecto = await ensureProyectoNode(input.proyectoId);

  const rolPrincipal = input.rolPrincipal.trim();
  if (!rolPrincipal) throw new Error("El rol principal es obligatorio.");

  const relationType = "participa_en";
  const metadata = buildEdgeMetadata({ rolPrincipal });

  const edge = await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: persona.id,
        targetNodeId: proyecto.id,
        relationType,
      },
    },
    create: {
      sourceNodeId: persona.id,
      targetNodeId: proyecto.id,
      relationType,
      context: input.contexto?.trim() ?? "",
      metadata: metadata as Prisma.InputJsonValue,
      reconocido: true,
    },
    update: {
      context: input.contexto?.trim() ?? "",
      metadata: metadata as Prisma.InputJsonValue,
      reconocido: true,
    },
    include: { sourceNode: true, targetNode: true },
  });

  const relation = kgEdgeToRelacionPersonaProyecto(
    edge,
    edge.sourceNode,
    edge.targetNode,
  );
  if (!relation) throw new Error("No se pudo materializar la relación.");
  return relation;
}

export async function createRelacionPersonaCampo(
  input: CreateRelacionPersonaCampoPayload & { personaNombre?: string },
): Promise<RelacionPersonaCampo> {
  const persona = await ensurePersonaNode(input.personaId, input.personaNombre);
  const campoNode = await ensureCampoConceptoNode(input.campoSlug.trim());
  const relationType = "pertenece_a";

  const edge = await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: persona.id,
        targetNodeId: campoNode.id,
        relationType,
      },
    },
    create: {
      sourceNodeId: persona.id,
      targetNodeId: campoNode.id,
      relationType,
      context: input.contexto?.trim() ?? "",
      metadata: {},
      reconocido: true,
    },
    update: {
      context: input.contexto?.trim() ?? "",
      reconocido: true,
    },
    include: { sourceNode: true, targetNode: true },
  });

  const relation = kgEdgeToRelacionPersonaCampo(
    edge,
    edge.sourceNode,
    edge.targetNode,
  );
  if (!relation) throw new Error("No se pudo materializar la relación con el campo.");
  return relation;
}

export async function updateRelacionEntity(
  edgeId: string,
  input: UpdateRelacionPayload,
): Promise<RelacionPersonaPersona | RelacionPersonaProyecto | RelacionPersonaCampo> {
  const edge = await prisma.kgEdge.findUnique({
    where: { id: edgeId },
    include: { sourceNode: true, targetNode: true },
  });
  if (!edge) throw new Error("Relación no encontrada.");

  const metadata = parseMetadataJson(edge.metadata);
  if (input.rolPrincipal !== undefined) {
    metadata.rolPrincipal = input.rolPrincipal.trim();
  }

  const updated = await prisma.kgEdge.update({
    where: { id: edgeId },
    data: {
      relationType: input.tipoRelacion?.trim() || edge.relationType,
      context: input.contexto !== undefined ? input.contexto : edge.context,
      metadata: metadata as Prisma.InputJsonValue,
    },
    include: { sourceNode: true, targetNode: true },
  });

  const personaPersona = kgEdgeToRelacionPersonaPersona(
    updated,
    updated.sourceNode,
    updated.targetNode,
  );
  if (personaPersona) return personaPersona;

  const personaProyecto = kgEdgeToRelacionPersonaProyecto(
    updated,
    updated.sourceNode,
    updated.targetNode,
  );
  if (personaProyecto) return personaProyecto;

  const personaCampo = kgEdgeToRelacionPersonaCampo(
    updated,
    updated.sourceNode,
    updated.targetNode,
  );
  if (personaCampo) return personaCampo;

  throw new Error("La arista no es una relación de persona reconocida.");
}

export async function deleteRelacionEntity(edgeId: string): Promise<void> {
  const edge = await prisma.kgEdge.findUnique({ where: { id: edgeId } });
  if (!edge) throw new Error("Relación no encontrada.");
  await prisma.kgEdge.delete({ where: { id: edgeId } });
}
