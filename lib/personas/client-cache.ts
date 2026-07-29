/** Cache cliente para sobrevivir cold-starts / instancias vacías de Vercel SQLite. */

import type { Persona } from "@/lib/personas/model";
import type { PersonaCardDto } from "@/lib/personas/types";
import { personaSlugFromName } from "@/lib/personas/slug";

const PERSONA_PREFIX = "deprocast:persona:";
const PERSONA_INDEX_KEY = "deprocast:persona-index";

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PERSONA_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  if (typeof window === "undefined") return;
  const unique = [...new Set(ids)].slice(0, 40);
  sessionStorage.setItem(PERSONA_INDEX_KEY, JSON.stringify(unique));
}

export function cachePersonaEntity(persona: Persona): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${PERSONA_PREFIX}${persona.id}`,
      JSON.stringify(persona),
    );
    const slug = personaSlugFromName(persona.nombrePrincipal);
    if (slug) {
      sessionStorage.setItem(`${PERSONA_PREFIX}slug:${slug}`, persona.id);
    }
    writeIndex([persona.id, ...readIndex()]);
  } catch {
    // quota / private mode
  }
}

export function readCachedPersona(idOrSlug: string): Persona | null {
  if (typeof window === "undefined") return null;
  try {
    const direct = sessionStorage.getItem(`${PERSONA_PREFIX}${idOrSlug}`);
    if (direct) return JSON.parse(direct) as Persona;

    const mappedId = sessionStorage.getItem(
      `${PERSONA_PREFIX}slug:${idOrSlug}`,
    );
    if (!mappedId) return null;
    const byId = sessionStorage.getItem(`${PERSONA_PREFIX}${mappedId}`);
    return byId ? (JSON.parse(byId) as Persona) : null;
  } catch {
    return null;
  }
}

export function personaToCardDto(persona: Persona): PersonaCardDto {
  return {
    id: persona.id,
    slug: personaSlugFromName(persona.nombrePrincipal),
    primaryName: persona.nombrePrincipal,
    aliases: persona.aliases ?? [],
    personaKind: null,
    role: null,
    campoSlug: null,
    confidence: 1,
    reconocido: true,
    lastMentionAt: null,
    mentionCount: 0,
    projects: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Fusiona tarjetas del servidor con altas recientes en sessionStorage. */
export function mergeCachedPersonaCards(
  serverPersonas: PersonaCardDto[],
): PersonaCardDto[] {
  if (typeof window === "undefined") return serverPersonas;

  const byId = new Map(serverPersonas.map((p) => [p.id, p]));
  for (const id of readIndex()) {
    if (byId.has(id)) continue;
    const cached = readCachedPersona(id);
    if (!cached) continue;
    byId.set(id, personaToCardDto(cached));
  }
  return [...byId.values()];
}
