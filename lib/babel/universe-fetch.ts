import { UNIVERSE_HEADER } from "@/lib/babel/constants";

export type UniverseFetchInit = RequestInit & {
  universeSlug?: string | null;
};

/** Inyecta universo activo en query param y header para APIs server-side. */
export function withUniverseFetchInit(
  init: UniverseFetchInit = {},
): RequestInit {
  const { universeSlug, headers: inputHeaders, ...rest } = init;
  const headers = new Headers(inputHeaders);

  if (universeSlug) {
    headers.set(UNIVERSE_HEADER, universeSlug);
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
