import "server-only";

import {
  ROOT_UNIVERSE_SLUG,
  UNIVERSE_HEADER,
  UNIVERSE_SLUG_RE,
} from "@/lib/babel/constants";
import type { NextRequest } from "next/server";

export function isUniverseSlug(value: unknown): value is string {
  return typeof value === "string" && UNIVERSE_SLUG_RE.test(value);
}

/** Resuelve el sello de contexto desde body, header o default Babel. */
export function resolveContextSeal(input: {
  universeSlug?: string | null;
  headerValue?: string | null;
}): string {
  if (input.universeSlug && isUniverseSlug(input.universeSlug)) {
    return input.universeSlug;
  }
  if (input.headerValue && isUniverseSlug(input.headerValue)) {
    return input.headerValue;
  }
  return ROOT_UNIVERSE_SLUG;
}

export function resolveContextSealFromRequest(
  request: NextRequest,
  body?: { universeSlug?: string | null },
): string {
  const headerValue = request.headers.get(UNIVERSE_HEADER);
  const queryValue = request.nextUrl.searchParams.get("universe");
  return resolveContextSeal({
    universeSlug: body?.universeSlug ?? queryValue,
    headerValue,
  });
}

/** Babel = sin filtro; otros universos filtran por contextSeal. */
export function shouldFilterByUniverse(universeSlug: string): boolean {
  return universeSlug !== ROOT_UNIVERSE_SLUG;
}
