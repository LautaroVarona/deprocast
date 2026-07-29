/** Cache cliente para sobrevivir cold-starts / instancias vacías de Vercel SQLite. */

import type { Persona, PersonaLinkTarget } from "@/lib/personas/model";
import type { PersonaCardDto } from "@/lib/personas/types";
import { personaSlugFromName } from "@/lib/personas/slug";
import type { Project } from "@/lib/projects/types";

const PERSONA_PREFIX = "deprocast:persona:";
const PERSONA_INDEX_KEY = "deprocast:persona-index";
const PROJECT_PREFIX = "deprocast:project:";
const PROJECT_INDEX_KEY = "deprocast:project-index";

export const PERSONA_CACHE_HEADER = "x-deprocast-persona-cache";
export const PROJECT_CACHE_HEADER = "x-deprocast-project-cache";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readIndex(): string[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(PERSONA_INDEX_KEY);
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
  const store = storage();
  if (!store) return;
  const unique = [...new Set(ids)].slice(0, 40);
  store.setItem(PERSONA_INDEX_KEY, JSON.stringify(unique));
}

export function cachePersonaEntity(persona: Persona): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(`${PERSONA_PREFIX}${persona.id}`, JSON.stringify(persona));
    const slug = personaSlugFromName(persona.nombrePrincipal);
    if (slug) {
      store.setItem(`${PERSONA_PREFIX}slug:${slug}`, persona.id);
    }
    writeIndex([persona.id, ...readIndex()]);
  } catch {
    // quota / private mode
  }
}

export function readCachedPersona(idOrSlug: string): Persona | null {
  const store = storage();
  if (!store) return null;
  try {
    const direct = store.getItem(`${PERSONA_PREFIX}${idOrSlug}`);
    if (direct) return JSON.parse(direct) as Persona;

    const mappedId = store.getItem(`${PERSONA_PREFIX}slug:${idOrSlug}`);
    if (!mappedId) return null;
    const byId = store.getItem(`${PERSONA_PREFIX}${mappedId}`);
    return byId ? (JSON.parse(byId) as Persona) : null;
  } catch {
    return null;
  }
}

export function listCachedPersonas(): Persona[] {
  const result: Persona[] = [];
  for (const id of readIndex()) {
    const cached = readCachedPersona(id);
    if (cached) result.push(cached);
  }
  return result;
}

/** Payload compacto para header de rehidratación servidor. */
export function buildPersonaCacheHeaderPayload(): string | null {
  const personas = listCachedPersonas();
  if (personas.length === 0) return null;
  const compact = personas.map((p) => ({
    id: p.id,
    nombrePrincipal: p.nombrePrincipal,
    aliases: p.aliases?.slice(0, 5),
    notasGenerales: p.notasGenerales?.slice(0, 200),
  }));
  try {
    return encodeURIComponent(JSON.stringify(compact));
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

/** Fusiona tarjetas del servidor con altas recientes en localStorage. */
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

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

/** Destinos persona desde caché local (para pickers de vínculo). */
export function listCachedPersonaLinkTargets(input?: {
  excludeIds?: string[];
  q?: string;
}): PersonaLinkTarget[] {
  if (typeof window === "undefined") return [];

  const exclude = new Set(input?.excludeIds ?? []);
  const query = input?.q?.trim().toLowerCase() ?? "";

  const targets: PersonaLinkTarget[] = [];
  const seenNames = new Set<string>();

  for (const persona of listCachedPersonas()) {
    if (exclude.has(persona.id)) continue;
    const nameKey = normalizeLabel(persona.nombrePrincipal);
    if (seenNames.has(nameKey)) continue;
    if (
      query &&
      !persona.nombrePrincipal.toLowerCase().includes(query) &&
      !(persona.aliases ?? []).some((a) => a.toLowerCase().includes(query))
    ) {
      continue;
    }
    seenNames.add(nameKey);
    targets.push({
      id: persona.id,
      kind: "persona",
      label: persona.nombrePrincipal,
      sublabel: persona.aliases?.length ? persona.aliases.join(", ") : null,
      campoSlug: null,
    });
  }

  return targets;
}

export function mergePersonaLinkTargets(
  serverTargets: PersonaLinkTarget[],
  options?: { excludeIds?: string[]; q?: string },
): PersonaLinkTarget[] {
  const cached = listCachedPersonaLinkTargets(options);
  const byId = new Map<string, PersonaLinkTarget>();
  const byName = new Map<string, string>();

  for (const target of serverTargets) {
    byId.set(target.id, target);
    byName.set(normalizeLabel(target.label), target.id);
  }
  for (const target of cached) {
    const nameKey = normalizeLabel(target.label);
    if (byName.has(nameKey) || byId.has(target.id)) continue;
    byId.set(target.id, target);
    byName.set(nameKey, target.id);
  }

  return [...byId.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  );
}

function readProjectIndex(): string[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(PROJECT_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeProjectIndex(ids: string[]) {
  const store = storage();
  if (!store) return;
  store.setItem(PROJECT_INDEX_KEY, JSON.stringify([...new Set(ids)].slice(0, 40)));
}

export function cacheProjectEntity(project: Project): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
    writeProjectIndex([project.id, ...readProjectIndex()]);
  } catch {
    // quota
  }
}

export function listCachedProjects(): Project[] {
  const store = storage();
  if (!store) return [];
  const result: Project[] = [];
  for (const id of readProjectIndex()) {
    try {
      const raw = store.getItem(`${PROJECT_PREFIX}${id}`);
      if (!raw) continue;
      result.push(JSON.parse(raw) as Project);
    } catch {
      // skip
    }
  }
  return result;
}

export function buildProjectCacheHeaderPayload(): string | null {
  const projects = listCachedProjects();
  if (projects.length === 0) return null;
  const compact = projects.map((p) => ({
    id: p.id,
    title: p.title,
    campoSlug: p.campoSlug,
    campo: p.campo,
    description: p.description?.slice(0, 200),
    estado: p.estado,
    prioridad: p.prioridad,
    impacto: p.impacto,
    dificultad: p.dificultad,
  }));
  try {
    return encodeURIComponent(JSON.stringify(compact));
  } catch {
    return null;
  }
}

export function mergeCachedProjects(serverProjects: Project[]): Project[] {
  if (typeof window === "undefined") return serverProjects;
  const byId = new Map(serverProjects.map((p) => [p.id, p]));
  for (const cached of listCachedProjects()) {
    if (!byId.has(cached.id)) byId.set(cached.id, cached);
  }
  return [...byId.values()];
}
