import "server-only";

import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import type { NextRequest } from "next/server";

export type UniverseScope = {
  slug: string;
  filter: boolean;
};

export function getUniverseScope(universeSlug: string): UniverseScope {
  return {
    slug: universeSlug,
    filter: shouldFilterByUniverse(universeSlug),
  };
}

export function getUniverseScopeFromRequest(request: NextRequest): UniverseScope {
  const slug = resolveContextSealFromRequest(request);
  return getUniverseScope(slug);
}

export function getUniverseFilterSlug(universeSlug: string): string | undefined {
  return shouldFilterByUniverse(universeSlug) ? universeSlug : undefined;
}

export function getUniverseFilterSlugFromRequest(
  request: NextRequest,
): string | undefined {
  return getUniverseFilterSlug(resolveContextSealFromRequest(request));
}
