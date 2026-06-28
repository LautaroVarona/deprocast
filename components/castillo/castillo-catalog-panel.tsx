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
      <div className="shrink-0 space-y-2 border-b border-white/10 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Catálogo
        </p>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/30" />
          <input
            value={catalogQuery}
            onChange={(event) => setCatalogQuery(event.target.value)}
            placeholder="Buscar en el corpus…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-1.5 pr-2 pl-8 text-xs text-white placeholder:text-white/30"
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
                  ? "bg-white/12 text-white"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {catalog ? (
          <p className="font-mono text-[10px] text-white/30">
            {filteredCatalog.length} / {catalog.totalCount} ·{" "}
            {catalog.placedCount} en canvas
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <p className="p-3 text-xs text-white/40">Cargando catálogo…</p>
        ) : filteredCatalog.length === 0 ? (
          <p className="p-3 text-xs text-white/40">
            Sin ítems para este filtro.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filteredCatalog.map((item) => (
              <li
                key={`${item.sourceType}:${item.sourceId}`}
                className={cn(
                  "castillo-card rounded-lg border border-white/8 p-2.5",
                  item.placed && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium text-white">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-white/40">
                        {item.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-[9px] text-white/25">
                      {SOURCE_TYPE_LABELS[item.sourceType]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 shrink-0 text-white/50 hover:bg-white/10 hover:text-white"
                    disabled={isBusy || item.placed}
                    onClick={() => void placeItem(item)}
                    aria-label={`Añadir ${item.title}`}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
                {item.placed ? (
                  <p className="mt-1 font-mono text-[9px] text-emerald-400/70">
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
