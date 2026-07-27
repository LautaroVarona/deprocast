"use client";

import { useEffect, useState } from "react";
import {
  DOMAIN_REFRESH_EVENT,
  matchesDomainScope,
  type DomainRefreshDetail,
  type DomainRefreshScope,
} from "@/lib/domain-refresh";

/**
 * Escucha `deprocast:domain-refresh` y expone un `refreshKey` incremental.
 * Pasá un scope estable (string o constante de módulo) para filtrar.
 */
export function useDomainRefresh(
  scope: DomainRefreshScope | readonly DomainRefreshScope[] = "all",
): number {
  const [refreshKey, setRefreshKey] = useState(0);
  const scopes: DomainRefreshScope[] =
    typeof scope === "string" ? [scope] : [...scope];
  const scopeKey = scopes.join("|");

  useEffect(() => {
    const listened = scopeKey.split("|") as DomainRefreshScope[];

    const handler = (event: Event) => {
      const custom = event as CustomEvent<DomainRefreshDetail>;
      const detail = custom.detail ?? { scope: "all" as const };
      if (!matchesDomainScope(listened, detail.scope)) return;
      setRefreshKey((key) => key + 1);
    };

    window.addEventListener(DOMAIN_REFRESH_EVENT, handler);
    return () => window.removeEventListener(DOMAIN_REFRESH_EVENT, handler);
  }, [scopeKey]);

  return refreshKey;
}
