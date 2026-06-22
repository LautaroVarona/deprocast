import "server-only";

import { namesMatchFuzzy, normalizeName } from "@/lib/kg/normalize";
import { searchNodes } from "@/lib/kg/queries";
import { listLaboralChallenges } from "@/lib/laboral/challenges";
import { getCampoLabel } from "@/lib/projects/campos";
import { listCampos, listProjects } from "@/lib/projects/service";
import type { ChatEntityType, MentionSuggestion } from "@/lib/chat/types";

const CATEGORY_LIMIT = 8;
const TOTAL_LIMIT = 20;

type IndexedItem = MentionSuggestion & {
  searchText: string;
};

let cachedItems: IndexedItem[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

function tokenize(query: string): string[] {
  return normalizeName(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreItem(item: IndexedItem, query: string, tokens: string[]): number {
  if (!query.trim()) return 1;

  if (namesMatchFuzzy(item.label, query)) return 10;

  const haystack = normalizeName(item.searchText);
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 4;
  }
  return score;
}

async function buildIndex(): Promise<IndexedItem[]> {
  const now = Date.now();
  if (cachedItems && cacheExpiresAt > now) {
    return cachedItems;
  }

  const [projects, laboral, campos, personas] = await Promise.all([
    listProjects(),
    listLaboralChallenges(),
    listCampos(),
    searchNodes({ type: "persona", limit: 500 }),
  ]);

  const items: IndexedItem[] = [];

  for (const project of projects) {
    if (project.tipo === "proyecto") {
      items.push({
        entityType: "proyecto",
        entityId: project.id,
        label: project.title,
        subtitle: `${project.campo} · ${project.estado}`,
        score: 0,
        category: "Proyectos",
        searchText: [
          project.title,
          project.description,
          project.responsable,
          project.campo,
        ].join(" "),
      });
    } else if (project.tipo === "reto") {
      items.push({
        entityType: "reto",
        entityId: project.id,
        label: project.title,
        subtitle: `${project.campo} · reto`,
        score: 0,
        category: "Retos",
        searchText: [
          project.title,
          project.description,
          project.responsable,
          project.campo,
        ].join(" "),
      });
    } else if (project.tipo === "area") {
      items.push({
        entityType: "area",
        entityId: project.id,
        label: project.title,
        subtitle: `${project.campo} · área`,
        score: 0,
        category: "Áreas",
        searchText: [
          project.title,
          project.description,
          project.campo,
        ].join(" "),
      });
    }
  }

  for (const challenge of laboral) {
    items.push({
      entityType: "laboral_reto",
      entityId: challenge.id,
      label: challenge.title,
      subtitle: `${challenge.onda} · laboral`,
      score: 0,
      category: "Retos",
      searchText: [
        challenge.title,
        challenge.responsable,
        challenge.onda,
        challenge.observaciones,
      ].join(" "),
    });
  }

  for (const campo of campos) {
    items.push({
      entityType: "campo",
      entityId: campo.slug,
      label: getCampoLabel(campo.slug),
      subtitle: `campo · ${campo.count} proyectos`,
      score: 0,
      category: "Áreas",
      searchText: `${getCampoLabel(campo.slug)} ${campo.slug}`,
    });
  }

  for (const persona of personas) {
    const campoSlug =
      typeof persona.metadata.campoSlug === "string"
        ? persona.metadata.campoSlug
        : "";
    items.push({
      entityType: "persona",
      entityId: persona.id,
      label: persona.primaryName,
      subtitle: campoSlug
        ? `persona · ${getCampoLabel(campoSlug)}`
        : "persona",
      score: 0,
      category: "Personas",
      searchText: [persona.primaryName, ...persona.aliases].join(" "),
    });
  }

  cachedItems = items;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return items;
}

export async function searchMentionSuggestions(
  query: string,
  limit = TOTAL_LIMIT,
): Promise<MentionSuggestion[]> {
  const items = await buildIndex();
  const trimmed = query.trim();
  const tokens = tokenize(trimmed);

  const scored = items
    .map((item) => ({
      ...item,
      score: scoreItem(item, trimmed, tokens),
    }))
    .filter((item) => item.score > 0 || !trimmed)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.label.localeCompare(b.label, "es");
    });

  const byCategory = new Map<string, MentionSuggestion[]>();
  const results: MentionSuggestion[] = [];

  for (const item of scored) {
    const categoryItems = byCategory.get(item.category) ?? [];
    if (categoryItems.length >= CATEGORY_LIMIT) continue;

    const suggestion: MentionSuggestion = {
      entityType: item.entityType,
      entityId: item.entityId,
      label: item.label,
      subtitle: item.subtitle,
      score: item.score,
      category: item.category,
    };

    categoryItems.push(suggestion);
    byCategory.set(item.category, categoryItems);
    results.push(suggestion);

    if (results.length >= limit) break;
  }

  return results;
}

export function getEntityTypeLabel(entityType: ChatEntityType): string {
  const labels: Record<ChatEntityType, string> = {
    proyecto: "Proyecto",
    reto: "Reto",
    area: "Área",
    persona: "Persona",
    campo: "Campo",
    laboral_reto: "Reto laboral",
  };
  return labels[entityType];
}
