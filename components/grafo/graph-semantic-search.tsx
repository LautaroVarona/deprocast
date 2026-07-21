"use client";

import { colorForType } from "@/components/grafo/types";
import { Kbd } from "@/components/ui/kbd";
import type { GraphSearchMatch } from "@/lib/kg/graph-search";
import { cn } from "@/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";
import { useRef } from "react";

type GraphSemanticSearchProps = {
  query: string;
  onQueryChange: (query: string) => void;
  matches: GraphSearchMatch[];
  visibleCount: number;
  totalCount: number;
  onSelectMatch: (id: string) => void;
  className?: string;
};

export function GraphSemanticSearch({
  query,
  onQueryChange,
  matches,
  visibleCount,
  totalCount,
  onSelectMatch,
  className,
}: GraphSemanticSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const hasQuery = query.trim().length > 0;

  return (
    <div className={cn("relative min-w-[220px] flex-1 sm:max-w-md", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar en el grafo… (nombre, alias, tipo, relación)"
        className="h-8 w-full rounded-lg border border-input bg-background pr-20 pl-8 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      />
      <div className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
        {hasQuery ? (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {visibleCount}/{totalCount}
          </span>
        ) : (
          <Kbd className="hidden sm:inline-flex">ESC</Kbd>
        )}
      </div>
      {hasQuery && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          className="absolute top-1/2 right-12 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Limpiar búsqueda"
        >
          <XIcon className="size-3.5" />
        </button>
      )}

      {hasQuery && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {matches.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelectMatch(match.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForType(match.type) }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{match.primaryName}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {match.type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasQuery && matches.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Sin coincidencias en el subgrafo visible.
        </div>
      )}
    </div>
  );
}
