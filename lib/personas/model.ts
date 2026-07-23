/**
 * Modelo de dominio del subgrafo de Personas.
 * Persistido en KgNode (nodos), KgEdge (grafo) y tablas tipadas PersonTo*.
 */

export interface Persona {
  id: string;
  nombrePrincipal: string;
  aliases: string[];
  notasGenerales: string;
}

export interface RelacionPersonaPersona {
  id: string;
  origenId: string;
  destinoId: string;
  tipoRelacion: string;
  contexto: string;
}

export interface RelacionPersonaProyecto {
  id: string;
  personaId: string;
  proyectoId: string;
  rolPrincipal: string;
  contexto: string;
}

export interface RelacionPersonaCampo {
  id: string;
  personaId: string;
  campoNodeId: string;
  campoSlug: string;
  contexto: string;
}

export type PersonaLinkTargetKind = "persona" | "proyecto" | "campo";

export type PersonaGraphViewMode = "exclusive" | "mixed";

export type PersonaGraphNodeKind = "persona" | "proyecto" | "campo";

export interface PersonaGraphNode {
  id: string;
  nombrePrincipal: string;
  kind: PersonaGraphNodeKind;
  aliases: string[];
  degree: number;
  campoSlug?: string | null;
}

export type PersonaGraphEdgeKind =
  | "persona-persona"
  | "persona-proyecto"
  | "persona-campo";

export interface PersonaGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: PersonaGraphEdgeKind;
  tipoRelacion: string;
  rolPrincipal: string | null;
  contexto: string;
}

export interface PersonaGraphSnapshot {
  mode: PersonaGraphViewMode;
  nodes: PersonaGraphNode[];
  edges: PersonaGraphEdge[];
}

export interface CreatePersonaPayload {
  nombrePrincipal: string;
  aliases?: string[];
  notasGenerales?: string;
}

/** Borrador de vínculo al crear persona (antes de conocer el id origen). */
export type PersonaConnectionDraft = {
  targetId: string;
  targetKind: "persona" | "proyecto";
  targetLabel: string;
  relationContext: string;
  relationType?: string;
  strength?: number;
};

export interface CreatePersonaWithRelationsPayload {
  nombrePrincipal: string;
  aliases?: string[];
  notasGenerales?: string;
  connections?: PersonaConnectionDraft[];
}

export interface UpdatePersonaPayload {
  nombrePrincipal?: string;
  aliases?: string[];
  notasGenerales?: string;
}

export interface CreateRelacionPersonaPersonaPayload {
  origenId: string;
  destinoId: string;
  tipoRelacion: string;
  contexto?: string;
}

export interface CreateRelacionPersonaProyectoPayload {
  personaId: string;
  proyectoId: string;
  rolPrincipal: string;
  contexto?: string;
}

export interface CreateRelacionPersonaCampoPayload {
  personaId: string;
  campoSlug: string;
  contexto?: string;
}

export type PersonaRelationListItem = {
  id: string;
  kind: PersonaLinkTargetKind;
  label: string;
  relationType: string;
  rolPrincipal: string | null;
  contexto: string;
  targetId: string;
  campoSlug: string | null;
};

export type PersonaLinkTarget = {
  id: string;
  kind: PersonaLinkTargetKind;
  label: string;
  sublabel: string | null;
  campoSlug: string | null;
};

export interface UpdateRelacionPayload {
  tipoRelacion?: string;
  rolPrincipal?: string;
  contexto?: string;
}

export type CandidateEntityType = "PERSON" | "PROJECT" | "UNKNOWN";
export type CandidateEntityStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "MERGED";

export type EntityCandidateType = "PERSON" | "PROJECT";
export type EntityCandidateStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "MERGED";
