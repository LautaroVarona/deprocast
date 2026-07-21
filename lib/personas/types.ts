export type { Persona, RelacionPersonaPersona, RelacionPersonaProyecto } from "@/lib/personas/model";
import type { PersonaKind } from "@/lib/kg/types";

export type PersonaProjectLink = {
  nodeId: string;
  title: string;
  relationType: string;
  context: string;
  estado: string | null;
  avancePorcentaje: number | null;
  isOpen: boolean;
};

export type PersonaCardDto = {
  id: string;
  slug: string;
  primaryName: string;
  aliases: string[];
  personaKind: PersonaKind | null;
  role: string | null;
  campoSlug: string | null;
  confidence: number;
  reconocido: boolean;
  lastMentionAt: string | null;
  mentionCount: number;
  projects: { id: string; title: string }[];
  updatedAt: string;
};

export type PersonaListStatus = "verified" | "pending" | "all";

export type PersonaActivityItem = {
  id: string;
  kind: "mention" | "chat";
  occurredAt: string;
  sourceType: string;
  sourceLabel: string;
  sourceId: string;
  sourceHref: string | null;
  fragment: string;
  confidence: number | null;
};

export type PersonaDetailDto = {
  id: string;
  slug: string;
  primaryName: string;
  aliases: string[];
  personaKind: PersonaKind | null;
  role: string | null;
  campoSlug: string | null;
  confidence: number;
  mentionCount: number;
  lastMentionAt: string | null;
  createdAt: string;
  updatedAt: string;
  projects: PersonaProjectLink[];
  openLoops: PersonaProjectLink[];
  activity: PersonaActivityItem[];
};

export type CreatePersonaInput = {
  name: string;
  role?: string;
  personaKind?: PersonaKind;
  aliases?: string[];
  campoSlug?: string;
};
