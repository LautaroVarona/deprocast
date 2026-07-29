import { UNIVERSE_HEADER } from "@/lib/babel/constants";
import {
  PERSONA_CACHE_HEADER,
  PROJECT_CACHE_HEADER,
  buildPersonaCacheHeaderPayload,
  buildProjectCacheHeaderPayload,
} from "@/lib/personas/client-cache";

export type UniverseFetchInit = RequestInit & {
  universeSlug?: string | null;
  /** Incluir headers de rehidratación desde localStorage (default true en browser). */
  withClientCache?: boolean;
};

/** Inyecta universo activo en query param y header para APIs server-side. */
export function withUniverseFetchInit(
  init: UniverseFetchInit = {},
): RequestInit {
  const {
    universeSlug,
    headers: inputHeaders,
    withClientCache = true,
    ...rest
  } = init;
  const headers = new Headers(inputHeaders);

  if (universeSlug) {
    headers.set(UNIVERSE_HEADER, universeSlug);
  }

  if (withClientCache && typeof window !== "undefined") {
    const personaCache = buildPersonaCacheHeaderPayload();
    if (personaCache) headers.set(PERSONA_CACHE_HEADER, personaCache);
    const projectCache = buildProjectCacheHeaderPayload();
    if (projectCache) headers.set(PROJECT_CACHE_HEADER, projectCache);
  }

  return { ...rest, headers };
}

export function buildUniverseUrl(
  path: string,
  universeSlug?: string | null,
): string {
  if (!universeSlug) return path;

  const url = new URL(path, "http://local");
  url.searchParams.set("universe", universeSlug);
  return `${url.pathname}${url.search}`;
}

export async function fetchWithUniverse(
  path: string,
  init: UniverseFetchInit = {},
): Promise<Response> {
  const { universeSlug, ...rest } = init;
  const url = buildUniverseUrl(path, universeSlug);
  return fetch(url, withUniverseFetchInit({ ...rest, universeSlug }));
}
