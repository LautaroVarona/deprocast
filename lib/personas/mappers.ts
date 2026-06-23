import {
  parseAliasesJson,
  parseMetadataJson,
} from "@/lib/kg/normalize";
import type { KgEdge, KgNode } from "@prisma/client";
import type {
  Persona,
  PersonaGraphEdge,
  PersonaGraphEdgeKind,
  RelacionPersonaCampo,
  RelacionPersonaPersona,
  RelacionPersonaProyecto,
} from "@/lib/personas/model";

const NOTAS_KEY = "notas";
const ROL_PRINCIPAL_KEY = "rolPrincipal";

export function extractNotas(metadata: Record<string, unknown>): string {
  const value = metadata[NOTAS_KEY];
  return typeof value === "string" ? value : "";
}

export function kgNodeToPersona(node: KgNode): Persona {
  const metadata = parseMetadataJson(node.metadata);
  return {
    id: node.id,
    nombrePrincipal: node.primaryName,
    aliases: parseAliasesJson(node.aliases),
    notasGenerales: extractNotas(metadata),
  };
}

function resolvePersonaIds(
  edge: KgEdge,
  source: KgNode,
  target: KgNode,
): { personaId: string; proyectoId: string } | null {
  if (source.type === "persona" && target.type === "proyecto") {
    return { personaId: source.id, proyectoId: target.id };
  }
  if (source.type === "proyecto" && target.type === "persona") {
    return { personaId: target.id, proyectoId: source.id };
  }
  return null;
}

export function kgEdgeToRelacionPersonaPersona(
  edge: KgEdge,
  source: KgNode,
  target: KgNode,
): RelacionPersonaPersona | null {
  if (source.type !== "persona" || target.type !== "persona") return null;
  return {
    id: edge.id,
    origenId: edge.sourceNodeId,
    destinoId: edge.targetNodeId,
    tipoRelacion: edge.relationType,
    contexto: edge.context,
  };
}

export function kgEdgeToRelacionPersonaProyecto(
  edge: KgEdge,
  source: KgNode,
  target: KgNode,
): RelacionPersonaProyecto | null {
  const ids = resolvePersonaIds(edge, source, target);
  if (!ids) return null;

  const metadata = parseMetadataJson(edge.metadata);
  const rolPrincipal =
    typeof metadata[ROL_PRINCIPAL_KEY] === "string"
      ? metadata[ROL_PRINCIPAL_KEY]
      : edge.relationType;

  return {
    id: edge.id,
    personaId: ids.personaId,
    proyectoId: ids.proyectoId,
    rolPrincipal,
    contexto: edge.context,
  };
}

function isCampoConcepto(node: KgNode): boolean {
  if (node.type !== "concepto") return false;
  const metadata = parseMetadataJson(node.metadata);
  return typeof metadata.campoSlug === "string" && metadata.campoSlug.length > 0;
}

export function kgEdgeToRelacionPersonaCampo(
  edge: KgEdge,
  source: KgNode,
  target: KgNode,
): RelacionPersonaCampo | null {
  let personaId: string | null = null;
  let campoNode: KgNode | null = null;

  if (source.type === "persona" && isCampoConcepto(target)) {
    personaId = source.id;
    campoNode = target;
  } else if (target.type === "persona" && isCampoConcepto(source)) {
    personaId = target.id;
    campoNode = source;
  }

  if (!personaId || !campoNode) return null;

  const metadata = parseMetadataJson(campoNode.metadata);
  const campoSlug =
    typeof metadata.campoSlug === "string" ? metadata.campoSlug : "";

  return {
    id: edge.id,
    personaId,
    campoNodeId: campoNode.id,
    campoSlug,
    contexto: edge.context,
  };
}

export function toPersonaGraphEdge(
  edge: KgEdge,
  source: KgNode,
  target: KgNode,
): PersonaGraphEdge | null {
  let kind: PersonaGraphEdgeKind | null = null;
  if (source.type === "persona" && target.type === "persona") {
    kind = "persona-persona";
  } else if (
    (source.type === "persona" && target.type === "proyecto") ||
    (source.type === "proyecto" && target.type === "persona")
  ) {
    kind = "persona-proyecto";
  } else if (
    (source.type === "persona" && isCampoConcepto(target)) ||
    (target.type === "persona" && isCampoConcepto(source))
  ) {
    kind = "persona-campo";
  }
  if (!kind) return null;

  const metadata = parseMetadataJson(edge.metadata);
  const rolPrincipal =
    kind === "persona-proyecto" && typeof metadata[ROL_PRINCIPAL_KEY] === "string"
      ? metadata[ROL_PRINCIPAL_KEY]
      : null;

  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    kind,
    tipoRelacion: edge.relationType,
    rolPrincipal,
    contexto: edge.context,
  };
}

export function buildEdgeMetadata(input: {
  rolPrincipal?: string;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  if (input.rolPrincipal?.trim()) {
    metadata[ROL_PRINCIPAL_KEY] = input.rolPrincipal.trim();
  }
  return metadata;
}

export function buildPersonaMetadata(input: {
  notasGenerales?: string;
  existing?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(input.existing ?? {}),
    ...(input.notasGenerales !== undefined
      ? { [NOTAS_KEY]: input.notasGenerales }
      : {}),
  };
}
