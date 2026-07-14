"use client";

import { useBabel } from "@/components/babel/babel-context";
import {
  ARCHIVO_KIND_LABELS,
  type ArchivoItemDetail,
  type ArchivoItemSummary,
  type ArchivoKind,
  type ArchivoSearchHit,
} from "@/lib/archivo/types";
import { ArchivoDetailPanel } from "@/components/archivo/archivo-detail-panel";
import { ArchivoItemCard } from "@/components/archivo/archivo-item-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArchiveIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ViewMode = "cards" | "list";

const ALL_KINDS = "all" as const;
type KindFilter = ArchivoKind | typeof ALL_KINDS;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ArchivoWorkspace() {
  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();
  const [items, setItems] = useState<ArchivoItemSummary[]>([]);
  const [byKind, setByKind] = useState<Record<ArchivoKind, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [kindFilter, setKindFilter] = useState<KindFilter>(ALL_KINDS);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<ArchivoSearchHit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ArchivoItemDetail | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await universeFetch("/api/archivo", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el archivo.");
      }
      setItems(data.items ?? []);
      setByKind(data.byKind ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    setItems([]);
    setSearchHits(null);
    setSelectedId(null);
    setSelectedDetail(null);
  }, [universeSlug]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void fetchItems();
  }, [fetchItems, universeSlug, isUniverseLoading]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchHits(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (kindFilter !== ALL_KINDS) params.set("kind", kindFilter);
        const response = await universeFetch(`/api/archivo/search?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Búsqueda fallida.");
        }
        setSearchHits(data.hits ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error en búsqueda.");
        setSearchHits([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery, kindFilter, universeFetch]);

  const visibleItems = useMemo(() => {
    const base = searchHits ?? items;
    if (kindFilter === ALL_KINDS || searchHits) return base;
    return base.filter((item) => item.kind === kindFilter);
  }, [items, searchHits, kindFilter]);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setIsDetailLoading(true);
    setSelectedDetail(null);
    try {
      const response = await universeFetch(`/api/archivo/${encodeURIComponent(id)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el documento.");
      }
      setSelectedDetail(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al abrir documento.");
      setSelectedId(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, [universeFetch]);

  const totalCount = items.length;

  return (
    <div className="archivo-noir-root mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArchiveIcon className="size-5 text-sky-400/70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Archivo · Materia Prima
              </p>
            </div>
            <h1 className="bg-gradient-to-r from-sky-100 via-white/90 to-white/50 bg-clip-text font-mono text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Todo lo que subiste, en bruto
            </h1>
            <p className="max-w-2xl text-sm text-white/45">
              Textos, cuadernos, transcripciones de audio, diarios, proyectos y
              cola del Purifier — unificado con fechas, tag dominante y búsqueda
              semántica heurística.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-white/35">
            {isLoading ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <span>{totalCount} documentos indexados</span>
            )}
          </div>
        </div>
      </header>

      <div className="archivo-noir-panel flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Búsqueda semántica — conceptos, proyectos, fragmentos…"
              className="w-full rounded-md border border-white/10 bg-black/60 py-2.5 pl-10 pr-4 font-mono text-xs text-white/80 outline-none transition focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
            />
            {isSearching ? (
              <Loader2Icon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-sky-400/70" />
            ) : null}
          </div>

          <div className="flex items-center gap-1 rounded-md border border-white/10 p-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setViewMode("cards")}
              className={cn(
                "h-8 gap-1.5 font-mono text-[10px] uppercase tracking-wider",
                viewMode === "cards"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              <LayoutGridIcon className="size-3.5" />
              Cards
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 gap-1.5 font-mono text-[10px] uppercase tracking-wider",
                viewMode === "list"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              <ListIcon className="size-3.5" />
              Lista
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setKindFilter(ALL_KINDS)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
              kindFilter === ALL_KINDS
                ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                : "border-white/10 text-white/35 hover:border-white/20 hover:text-white/60",
            )}
          >
            Todos ({totalCount})
          </button>
          {(Object.keys(ARCHIVO_KIND_LABELS) as ArchivoKind[]).map((kind) => {
            const count = byKind?.[kind] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setKindFilter(kind)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                  kindFilter === kind
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                    : "border-white/10 text-white/35 hover:border-white/20 hover:text-white/60",
                )}
              >
                {ARCHIVO_KIND_LABELS[kind]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300/90">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="archivo-noir-panel min-h-[24rem] p-4 sm:p-5">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 font-mono text-xs text-white/35">
              <Loader2Icon className="size-4 animate-spin" />
              Indexando archivo…
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex h-48 items-center justify-center font-mono text-xs text-white/30">
              {searchQuery.trim()
                ? "Sin coincidencias para esta búsqueda."
                : "No hay documentos en el archivo todavía."}
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleItems.map((item) => (
                <ArchivoItemCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => void loadDetail(item.id)}
                  formatDate={formatDate}
                  snippet={
                    "snippet" in item
                      ? (item as ArchivoSearchHit).snippet
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/8">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 px-2 py-3 text-left transition hover:bg-white/[0.03]",
                    selectedId === item.id && "bg-sky-500/5",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm text-white/85">
                      {item.title}
                    </span>
                    <span className="font-mono text-[10px] text-white/30">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-white/40">
                    <span className="rounded border border-white/10 px-1.5 py-0.5">
                      {ARCHIVO_KIND_LABELS[item.kind]}
                    </span>
                    {item.strongestTag ? (
                      <span className="text-amber-300/80">
                        #{item.strongestTag.label}{" "}
                        <span className="text-white/25">
                          ({item.strongestTag.weight})
                        </span>
                      </span>
                    ) : null}
                    <span className="text-white/25">
                      {item.charCount.toLocaleString("es-AR")} chars
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-white/35">
                    {"snippet" in item
                      ? (item as ArchivoSearchHit).snippet
                      : item.preview}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <ArchivoDetailPanel
          detail={selectedDetail}
          isLoading={isDetailLoading}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
}
