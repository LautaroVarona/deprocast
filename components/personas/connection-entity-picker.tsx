"use client";

import type { PersonaLinkTarget } from "@/lib/personas/model";
import { cn } from "@/lib/utils";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type ConnectionEntityPickerProps = {
  excludeIds?: string[];
  onSelect: (target: PersonaLinkTarget) => void;
  className?: string;
};

export function ConnectionEntityPicker({
  excludeIds = [],
  onSelect,
  className,
}: ConnectionEntityPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonaLinkTarget[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const excludeKey = excludeIds.join("|");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const exclude = new Set(excludeIds);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed });
        const [personasRes, proyectosRes] = await Promise.all([
          fetch(`/api/personas/link-targets?kind=persona&${params}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/personas/link-targets?kind=proyecto&${params}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const personasData = personasRes.ok
          ? ((await personasRes.json()) as { targets?: PersonaLinkTarget[] })
          : { targets: [] };
        const proyectosData = proyectosRes.ok
          ? ((await proyectosRes.json()) as { targets?: PersonaLinkTarget[] })
          : { targets: [] };

        const merged = [
          ...(personasData.targets ?? []),
          ...(proyectosData.targets ?? []),
        ].filter((target) => !exclude.has(target.id));

        setResults(merged);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // excludeIds se serializa en excludeKey para evitar re-fetch por identidad de array.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- excludeKey es la dependencia estable
  }, [excludeKey, query]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Buscar persona o proyecto…"
          className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {isLoading && (
          <Loader2Icon className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md"
        >
          {results.map((target) => (
            <li key={`${target.kind}:${target.id}`}>
              <button
                type="button"
                role="option"
                className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
                onClick={() => {
                  onSelect(target);
                  setQuery("");
                  setResults([]);
                  setIsOpen(false);
                }}
              >
                <span className="font-medium">{target.label}</span>
                <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {target.kind}
                  {target.sublabel ? ` · ${target.sublabel}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !isLoading && query.trim() && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          Sin resultados en el grafo.
        </div>
      )}
    </div>
  );
}
