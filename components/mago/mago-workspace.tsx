"use client";

import { MagoColeccionPanel } from "@/components/mago/mago-coleccion-panel";
import { MagoFilterBar } from "@/components/mago/mago-filter-bar";
import { getFilterForLens, MagoLensBar } from "@/components/mago/mago-lens-bar";
import { MagoLevelCard } from "@/components/mago/mago-level-card";
import { buttonVariants } from "@/components/ui/button";
import { filterPagesByTipo } from "@/lib/mago/filters";
import { MAGO_LENSES, type MagoLensId } from "@/lib/mago/tradition";
import type { MagoMatrixResponse, PaginaMago22 } from "@/lib/mago/types";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type MagoWorkspaceProps = {
  lensId?: MagoLensId;
};

export function MagoWorkspace({ lensId = "mago-22" }: MagoWorkspaceProps) {
  const lens = MAGO_LENSES.find((entry) => entry.id === lensId) ?? MAGO_LENSES[0];
  const defaultFilter = getFilterForLens(lensId);

  const [pages, setPages] = useState<PaginaMago22[]>([]);
  const [colecciones, setColecciones] = useState<
    MagoMatrixResponse["colecciones"]
  >([]);
  const [filter, setFilter] = useState(defaultFilter);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilter(defaultFilter);
  }, [defaultFilter]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mago", { cache: "no-store" });
      const data = (await res.json()) as MagoMatrixResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Error al cargar el Mago");
      setPages(data.pages ?? []);
      setColecciones(data.colecciones ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visiblePages = useMemo(
    () => filterPagesByTipo(pages, filter),
    [pages, filter],
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        <Link
          href="/ludus/castillo"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <ArrowLeftIcon className="size-3.5" />
          Castillo
        </Link>

        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-accent" aria-hidden />
          <div>
            <h1 className="text-sm font-semibold text-foreground">{lens.label}</h1>
            <p className="font-mono text-[10px] text-muted-foreground">{lens.subtitle}</p>
          </div>
        </div>

        <MagoLensBar activeId={lens.id} />

        {lensId === "mago-22" ? (
          <MagoFilterBar value={filter} onChange={setFilter} />
        ) : null}

        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "ml-auto text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
          onClick={() => void refresh()}
          disabled={isLoading}
          aria-label="Actualizar"
        >
          <RefreshCwIcon className={isLoading ? "animate-spin" : ""} />
        </button>
      </header>

      {error ? (
        <p className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading && pages.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">Cargando matriz…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePages.map((page) => (
                <MagoLevelCard
                  key={page.id}
                  page={page}
                  selected={selectedSlot === page.id}
                  onSelect={() => setSelectedSlot(page.id)}
                  emphasizeTradition
                />
              ))}
            </div>
          )}
        </main>

        <MagoColeccionPanel
          colecciones={colecciones}
          selectedSlot={selectedSlot}
          onChanged={() => void refresh()}
        />
      </div>
    </div>
  );
}
