"use client";

import { useCastillo } from "@/components/castillo/castillo-context";
import { Button } from "@/components/ui/button";
import { SOURCE_TYPE_LABELS } from "@/lib/castillo/constants";
import {
  CASTLE_SOURCE_TYPES,
  type CastleSourceType,
} from "@/lib/castillo/types";
import { cn } from "@/lib/utils";
import { PlusIcon, SearchIcon } from "lucide-react";

const FILTER_OPTIONS: Array<{ value: CastleSourceType | "all"; label: string }> =
  [
    { value: "all", label: "Todo" },
    ...CASTLE_SOURCE_TYPES.filter((type) => type !== "freeform").map(
      (type) => ({
        value: type,
        label: SOURCE_TYPE_LABELS[type],
      }),
    ),
  ];

export function CastilloCatalogPanel() {
  const {
    catalog,
    isLoading,
    isBusy,
    catalogQuery,
    catalogFilter,
    setCatalogQuery,
    setCatalogFilter,
    filteredCatalog,
    placeItem,
  } = useCastillo();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Catálogo
        </p>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={catalogQuery}
            onChange={(event) => setCatalogQuery(event.target.value)}
            placeholder="Buscar en el corpus…"
            className="w-full rounded-lg border border-border bg-card/80 py-1.5 pr-2 pl-8 text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCatalogFilter(option.value)}
              className={cn(
                "rounded-md px-2 py-0.5 font-mono text-[10px] transition-colors",
                catalogFilter === option.value
                  ? "bg-foreground/12 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {catalog ? (
          <p className="font-mono text-[10px] text-muted-foreground">
            {filteredCatalog.length} / {catalog.totalCount} ·{" "}
            {catalog.placedCount} en canvas
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <p className="p-3 text-xs text-muted-foreground">Cargando catálogo…</p>
        ) : filteredCatalog.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            Sin ítems para este filtro.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filteredCatalog.map((item) => (
              <li
                key={`${item.sourceType}:${item.sourceId}`}
                className={cn(
                  "castillo-card rounded-lg border border-border p-2.5",
                  item.placed && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                        {item.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {SOURCE_TYPE_LABELS[item.sourceType]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 shrink-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    disabled={isBusy || item.placed}
                    onClick={() => void placeItem(item)}
                    aria-label={`Añadir ${item.title}`}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
                {item.placed ? (
                  <p className="mt-1 font-mono text-[10px] text-primary/70">
                    En canvas
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
