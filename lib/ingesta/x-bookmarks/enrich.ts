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

  const firstSentence = cleaned.split(/[.!?¡¿\n]/).find((part) => part.trim())?.trim();
  const base = firstSentence || cleaned;
  const truncated =
    base.length > 72 ? `${base.slice(0, 69).trimEnd()}…` : base;

  if (keywords.length > 0) {
    return `${truncated} · ${keywords.slice(0, 2).join(", ")}`;
  }

  return truncated || `Insight de ${tweet.author}`;
}

/**
 * Mock del agente de IA: genera título, tags y vínculos existenciales
 * a partir de heurísticas locales (sin llamada a Vertex).
 */
export async function mockEnrichXBookmark(
  tweet: XBookmarkTweet,
): Promise<XBookmarkEnrichment> {
  await new Promise((resolve) => setTimeout(resolve, 12));

  const metaTags = extractKeywords(tweet.text);
  const linkedProjects = detectLinkedProjects(tweet.text);
  const titleEs = buildTitleEs(tweet, metaTags);

  return {
    titleEs,
    metaTags,
    linkedProjects,
  };
}

export async function mockEnrichXBookmarks(
  tweets: XBookmarkTweet[],
): Promise<XBookmarkEnrichment[]> {
  return Promise.all(tweets.map((tweet) => mockEnrichXBookmark(tweet)));
}
