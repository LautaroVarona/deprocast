import "server-only";

import { cohereGenerateJson } from "@/lib/cohere/chat";
import {
  EXISTENTIAL_PROJECTS,
  type ExistentialProject,
  type XBookmarkEnrichment,
  type XBookmarkTweet,
} from "@/lib/ingesta/x-bookmarks/types";

const PROJECT_KEYWORDS: Record<ExistentialProject, string[]> = {
  Deprocast: [
    "deprocast",
    "atanor",
    "exoesqueleto",
    "cognitivo",
    "estructura",
    "mes",
    "purifier",
    "purificador",
    "knowledge graph",
    "grafo",
    "ingesta",
    "qorpus",
    "next.js",
    "sqlite",
  ],
  Studianta: [
    "studianta",
    "carrera",
    "academia",
    "universidad",
    "estudio",
    "estudiante",
    "académico",
    "facultad",
    "tesis",
    "aprendizaje",
    "curso",
  ],
  Versa: [
    "versa",
    "carro",
    "vehículo",
    "vehiculo",
    "visión",
    "vision",
    "automóvil",
    "automovil",
    "ruta",
    "conducir",
    "movilidad",
  ],
  "El Fotógrafo": [
    "fotógrafo",
    "fotografo",
    "foto",
    "video",
    "onda",
    "audiovisual",
    "cámara",
    "camara",
    "film",
    "cinematografía",
    "cinematografia",
    "edición",
    "edicion",
  ],
  Botmed: [
    "botmed",
    "medico",
    "médico",
    "salud",
    "clinica",
    "clínica",
    "paciente",
    "farmacia",
    "diagnostico",
    "diagnóstico",
    "telemedicina",
  ],
  Tuitmark: [
    "tuitmark",
    "bookmark",
    "marcador",
    "twitter",
    "x.com",
    "social",
    "clip",
    "guardado",
  ],
};

const STOP_WORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "y",
  "en",
  "un",
  "una",
  "que",
  "por",
  "con",
  "para",
  "es",
  "a",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "at",
  "is",
  "it",
  "this",
  "that",
  "rt",
  "https",
  "http",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractKeywords(text: string, limit = 6): string[] {
  const tokens = normalizeText(text)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\w\sáéíóúñ#@]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function detectLinkedProjects(text: string): ExistentialProject[] {
  const normalized = normalizeText(text);
  const linked: ExistentialProject[] = [];

  for (const project of EXISTENTIAL_PROJECTS) {
    const keywords = PROJECT_KEYWORDS[project];
    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      linked.push(project);
    }
  }

  return linked;
}

function buildTitleEs(tweet: XBookmarkTweet, keywords: string[]): string {
  const cleaned = tweet.text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const firstSentence = cleaned
    .split(/[.!?¡¿\n]/)
    .find((part) => part.trim())
    ?.trim();
  const base = firstSentence || cleaned;
  const truncated =
    base.length > 72 ? `${base.slice(0, 69).trimEnd()}…` : base;

  if (keywords.length > 0) {
    return `${truncated} · ${keywords.slice(0, 2).join(", ")}`;
  }

  return truncated || `Insight de ${tweet.author}`;
}

function heuristicEnrich(tweet: XBookmarkTweet): XBookmarkEnrichment {
  const metaTags = extractKeywords(tweet.text);
  const linkedProjects = detectLinkedProjects(tweet.text);
  const titleEs = buildTitleEs(tweet, metaTags);
  return { titleEs, metaTags, linkedProjects };
}

function isExistentialProject(value: string): value is ExistentialProject {
  return (EXISTENTIAL_PROJECTS as readonly string[]).includes(value);
}

/**
 * Enriquecimiento cognitivo Cohere: titleEs, metaTags, linkedProjects.
 * Fallback heurístico si Cohere falla.
 */
export async function enrichXBookmark(
  tweet: XBookmarkTweet,
): Promise<XBookmarkEnrichment> {
  const fallback = heuristicEnrich(tweet);

  try {
    const result = await cohereGenerateJson<{
      titleEs?: string;
      metaTags?: string[];
      linkedProjects?: string[];
    }>({
      systemPrompt: `Sos un motor cognitivo de marcadores sociales.
Devolvé SOLO JSON con:
- titleEs: título corto en español (máx 90 chars)
- metaTags: 3-8 tags semánticos
- linkedProjects: subset de [${EXISTENTIAL_PROJECTS.map((p) => `"${p}"`).join(", ")}]
No inventes proyectos fuera de esa lista.`,
      userContent: JSON.stringify({
        author: tweet.author,
        handle: tweet.handle,
        text: tweet.text,
        url: tweet.tweetUrl,
      }),
      temperature: 0.2,
      maxTokens: 400,
      throttle: true,
    });

    const metaTags = Array.isArray(result.metaTags)
      ? result.metaTags.filter((t) => typeof t === "string" && t.trim())
      : fallback.metaTags;

    const linkedProjects = Array.isArray(result.linkedProjects)
      ? result.linkedProjects.filter(isExistentialProject)
      : fallback.linkedProjects;

    const titleEs =
      typeof result.titleEs === "string" && result.titleEs.trim()
        ? result.titleEs.trim().slice(0, 120)
        : fallback.titleEs;

    return {
      titleEs,
      metaTags: metaTags.length > 0 ? metaTags : fallback.metaTags,
      linkedProjects:
        linkedProjects.length > 0
          ? linkedProjects
          : fallback.linkedProjects,
    };
  } catch (error) {
    console.warn("Cohere enrich fallback:", error);
    return fallback;
  }
}

/** @deprecated Usar enrichXBookmark */
export async function mockEnrichXBookmark(
  tweet: XBookmarkTweet,
): Promise<XBookmarkEnrichment> {
  return enrichXBookmark(tweet);
}

export async function enrichXBookmarks(
  tweets: XBookmarkTweet[],
): Promise<XBookmarkEnrichment[]> {
  const results: XBookmarkEnrichment[] = [];
  for (const tweet of tweets) {
    results.push(await enrichXBookmark(tweet));
  }
  return results;
}

/** @deprecated Usar enrichXBookmarks */
export async function mockEnrichXBookmarks(
  tweets: XBookmarkTweet[],
): Promise<XBookmarkEnrichment[]> {
  return enrichXBookmarks(tweets);
}
