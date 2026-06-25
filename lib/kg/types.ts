export const NODE_TYPES = [
  "persona",
  "proyecto",
  "lugar",
  "idea",
  "tecnologia",
  "ley",
  "proceso",
  "organizacion",
  "concepto",
  "documento",
  "archivo",
  "modulo",
] as const;

export const PERSONA_KINDS = ["fisica", "juridica"] as const;

export const RELATION_TYPES = [
  "menciona_a",
  "trabaja_en",
  "responsable_de",
  "colabora_con",
  "pertenece_a",
  "relacionado_con",
  "participa_en",
  "avatar_de",
  "subordinado_de",
  "cliente_de",
  "competidor_de",
  "importa",
  "depende_de",
  "define",
  "documenta",
] as const;

export const MENTION_SOURCE_TYPES = [
  "audio_asset",
  "transcript",
  "parent_chunk",
  "journal",
  "project",
  "bookmark",
  "raw_document",
  "code_file",
  "master_plan",
  "chat",
  "health_event",
] as const;

// Tipos de nodo que pertenecen al subgrafo de codigo.
export const CODE_NODE_TYPES = ["archivo", "modulo"] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type PersonaKind = (typeof PERSONA_KINDS)[number];
export type RelationType = (typeof RELATION_TYPES)[number];
export type MentionSourceType = (typeof MENTION_SOURCE_TYPES)[number];

export type PersonaMetadata = {
  personaKind?: PersonaKind;
  legalName?: string;
  roles?: string[];
  campoSlug?: string;
  alsoProject?: boolean;
  linkedProjectNodeId?: string;
  secondaryTypes?: NodeType[];
};

export type LlmMention = {
  fragment: string;
  offsetStart?: number;
  offsetEnd?: number;
};

export type LlmEntity = {
  name: string;
  type: NodeType;
  aliases?: string[];
  personaKind?: PersonaKind;
  secondaryTypes?: NodeType[];
  metadata?: Record<string, unknown>;
  mentions?: LlmMention[];
  confidence?: number;
};

export type LlmRelation = {
  fromName: string;
  toName: string;
  relationType: RelationType;
  context: string;
  weight?: number;
  confidence?: number;
};

export type LlmKgExtraction = {
  entities: LlmEntity[];
  relations: LlmRelation[];
};

export type MentionSource = {
  type: MentionSourceType;
  id: string;
  metadata?: Record<string, unknown>;
  confidence?: number;
};

export type IngestInput = {
  extraction: LlmKgExtraction;
  source: MentionSource;
};

export type IngestResult = {
  nodeIds: string[];
  edgeIds: string[];
  mentionIds: string[];
  resolved: Record<string, string>;
};

export type KgNodeSummary = {
  id: string;
  primaryName: string;
  type: string;
  aliases: string[];
  metadata: Record<string, unknown>;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export function isNodeType(value: string): value is NodeType {
  return (NODE_TYPES as readonly string[]).includes(value);
}

export function isCodeNodeType(value: string): boolean {
  return (CODE_NODE_TYPES as readonly string[]).includes(value);
}

export function isRelationType(value: string): value is RelationType {
  return (RELATION_TYPES as readonly string[]).includes(value);
}

export function isMentionSourceType(value: string): value is MentionSourceType {
  return (MENTION_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isPersonaKind(value: string): value is PersonaKind {
  return (PERSONA_KINDS as readonly string[]).includes(value);
}
