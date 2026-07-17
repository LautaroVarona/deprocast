import type { ArcanaCore, MagoFilter, PaginaMago22, TipoLetraHebrea } from "@/lib/mago/types";

export function filterArcanaByTipo<T extends { core: ArcanaCore }>(
  pages: T[],
  filter: MagoFilter,
): T[] {
  if (filter === "total") return pages;
  return pages.filter((page) => page.core.tipo === (filter as TipoLetraHebrea));
}

export function filterPagesByTipo(
  pages: PaginaMago22[],
  filter: MagoFilter,
): PaginaMago22[] {
  return filterArcanaByTipo(pages, filter);
}
