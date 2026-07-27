/**
 * Bus de refresh entre vistas del dominio (personas / proyectos / grafo).
 * Client-only: CustomEvent en window. Sin store global.
 */

export const DOMAIN_REFRESH_EVENT = "deprocast:domain-refresh";

export type DomainRefreshScope = "personas" | "proyectos" | "kg" | "all";

export type DomainRefreshDetail = {
  scope: DomainRefreshScope;
  reason?: string;
};

export function notifyDomainRefresh(
  scope: DomainRefreshScope = "all",
  reason?: string,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DomainRefreshDetail>(DOMAIN_REFRESH_EVENT, {
      detail: { scope, reason },
    }),
  );
}

export function matchesDomainScope(
  listened: DomainRefreshScope | readonly DomainRefreshScope[],
  incoming: DomainRefreshScope,
): boolean {
  const scopes = Array.isArray(listened) ? listened : [listened];
  if (incoming === "all" || scopes.includes("all")) return true;
  return scopes.includes(incoming);
}
