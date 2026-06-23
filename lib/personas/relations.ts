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
import { listCampos } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";
import { Prisma, type KgNode } from "@prisma/client";

async function assertPersonaNode(id: string) {
  const node = await prisma.kgNode.findFirst({
    where: { id, type: "persona" },
  });
  if (!node) throw new Error("Persona no encontrada.");
  return node;
}

async function assertProyectoNode(id: string) {
  const node = await prisma.kgNode.findFirst({
    where: { id, type: "proyecto" },
  });
  if (!node) throw new Error("Proyecto no encontrado en el grafo.");
  return node;
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
  edge: {
    id: string;
    relationType: string;
    sourceNodeId: string;
    targetNodeId: string;
    context: string;
    sourceNode: KgNode;
    targetNode: KgNode;
  },
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
): Promise<PersonaRelationListItem[]> {
  await assertPersonaNode(personaId);

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
    const nodes = await searchNodes({ type: "proyecto", q: query, limit: 40 });
    return nodes.map((node) => ({
      id: node.id,
      kind: "proyecto" as const,
      label: node.primaryName,
      sublabel:
        typeof node.metadata.estado === "string" ? node.metadata.estado : null,
      campoSlug: null,
    }));
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
  input: CreateRelacionPersonaPersonaPayload,
): Promise<RelacionPersonaPersona> {
  if (input.origenId === input.destinoId) {
    throw new Error("Una persona no puede relacionarse consigo misma.");
  }

  await assertPersonaNode(input.origenId);
  await assertPersonaNode(input.destinoId);

  const tipoRelacion = input.tipoRelacion.trim();
  if (!tipoRelacion) throw new Error("El tipo de relación es obligatorio.");

  const edge = await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: input.origenId,
        targetNodeId: input.destinoId,
        relationType: tipoRelacion,
      },
    },
    create: {
      sourceNodeId: input.origenId,
      targetNodeId: input.destinoId,
      relationType: tipoRelacion,
      context: input.contexto?.trim() ?? "",
      metadata: {},
    },
    update: {
      context: input.contexto?.trim() ?? "",
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
  input: CreateRelacionPersonaProyectoPayload,
): Promise<RelacionPersonaProyecto> {
  await assertPersonaNode(input.personaId);
  await assertProyectoNode(input.proyectoId);

  const rolPrincipal = input.rolPrincipal.trim();
  if (!rolPrincipal) throw new Error("El rol principal es obligatorio.");

  const relationType = "participa_en";
  const metadata = buildEdgeMetadata({ rolPrincipal });

  const edge = await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: input.personaId,
        targetNodeId: input.proyectoId,
        relationType,
      },
    },
    create: {
      sourceNodeId: input.personaId,
      targetNodeId: input.proyectoId,
      relationType,
      context: input.contexto?.trim() ?? "",
      metadata: metadata as Prisma.InputJsonValue,
    },
    update: {
      context: input.contexto?.trim() ?? "",
      metadata: metadata as Prisma.InputJsonValue,
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
  input: CreateRelacionPersonaCampoPayload,
): Promise<RelacionPersonaCampo> {
  await assertPersonaNode(input.personaId);
  const campoNode = await ensureCampoConceptoNode(input.campoSlug.trim());
  const relationType = "pertenece_a";

  const edge = await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: input.personaId,
        targetNodeId: campoNode.id,
        relationType,
      },
    },
    create: {
      sourceNodeId: input.personaId,
      targetNodeId: campoNode.id,
      relationType,
      context: input.contexto?.trim() ?? "",
      metadata: {},
    },
    update: {
      context: input.contexto?.trim() ?? "",
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
