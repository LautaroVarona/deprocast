"use client";

import { useBabel } from "@/components/babel/babel-context";
import { UniverseSwitcher } from "@/components/babel/universe-switcher";
import { AreaFilterChips } from "@/components/cortex/area-filter-chips";
import { CortexMetricsBar } from "@/components/cortex/cortex-metrics-bar";
import { IngestModal } from "@/components/cortex/ingest-modal";
import { KnowledgeGrid } from "@/components/cortex/knowledge-grid";
import { Button, buttonVariants } from "@/components/ui/button";
import { matchesAreaFilter } from "@/lib/meta-meteador/area-theme";
import { cn } from "@/lib/utils";
import type { CortexSnapshot } from "@/lib/cortex/types";
import { META_AREAS, type MetaArea } from "@/lib/meta-meteador/types";
import { PlusIcon, RefreshCwIcon, Gamepad2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export function CortexDashboard() {
  const { activeUniverse } = useBabel();
  const [snapshot, setSnapshot] = useState<CortexSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeArea, setActiveArea] = useState<MetaArea | null>(null);
  const [ingestOpen, setIngestOpen] = useState(false);

  const loadSnapshot = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (activeUniverse?.slug) {
        params.set("universe", activeUniverse.slug);
      }

      const query = params.toString();
      const response = await fetch(`/api/cortex${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data: CortexSnapshot = await response.json();
      setSnapshot(data);
    } catch (error) {
      console.error(error);
      if (!silent) setSnapshot(null);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeUniverse?.slug]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const areaCounts = useMemo(() => {
    if (!snapshot) return undefined;

    const counts = {} as Partial<Record<MetaArea, number>>;
    for (const area of META_AREAS) {
      counts[area] = snapshot.nodes.filter((node) =>
        matchesAreaFilter(node.areas, area),
      ).length;
    }
    return counts;
  }, [snapshot]);

  const filteredCount = useMemo(() => {
    if (!snapshot) return 0;
    if (!activeArea) return snapshot.nodes.length;
    return snapshot.nodes.filter((node) =>
      matchesAreaFilter(node.areas, activeArea),
    ).length;
  }, [snapshot, activeArea]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Nexo de Datos
          </p>
          <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-3xl font-semibold tracking-tight">
            El Córtex
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Centro de control cognitivo: indexación cuántica, sesgo semántico y
            nodos de conocimiento desacoplados del corpus validado.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => void loadSnapshot()}
            aria-label="Actualizar Córtex"
          >
            <RefreshCwIcon className={isLoading ? "animate-spin" : ""} />
          </Button>
          <Link
            href="/ludus"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-2 rounded-full border-amber-500/30 bg-amber-500/5 text-amber-800 shadow-sm hover:bg-amber-500/10 dark:text-amber-200",
            )}
          >
            <Gamepad2Icon className="size-4" />
            Entrar al Ludus
          </Link>
          <Button
            type="button"
            size="lg"
            className="gap-2 rounded-full shadow-lg shadow-primary/10"
            onClick={() => setIngestOpen(true)}
          >
            <PlusIcon className="size-4" />
            Nuevo Estímulo
          </Button>
        </div>
      </header>

      <section
        aria-label="Universo activo"
        className="rounded-xl border border-border/70 bg-card/40 shadow-sm"
      >
        <UniverseSwitcher />
      </section>

      <CortexMetricsBar snapshot={snapshot} isLoading={isLoading} />

      <section aria-label="Matriz de nodos" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Tarjetas de Conocimiento
            </h2>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Sincronizando nodos…"
                : `${filteredCount} nodo${filteredCount === 1 ? "" : "s"} visibles`}
            </p>
          </div>
          <AreaFilterChips
            activeArea={activeArea}
            onAreaChange={setActiveArea}
            counts={areaCounts}
          />
        </div>

        <KnowledgeGrid
          nodes={snapshot?.nodes ?? []}
          activeArea={activeArea}
          isLoading={isLoading}
        />
      </section>

      <IngestModal
        open={ingestOpen}
        onClose={() => setIngestOpen(false)}
        onIngested={() => void loadSnapshot(true)}
      />
    </div>
  );
}
