"use client";

import { CastilloCanvas } from "@/components/castillo/castillo-canvas";
import { CastilloCatalogPanel } from "@/components/castillo/castillo-catalog-panel";
import {
  CastilloProvider,
  useCastillo,
} from "@/components/castillo/castillo-context";
import { CastilloGridTabs } from "@/components/castillo/castillo-grid-tabs";
import { CastilloSemanticMap } from "@/components/castillo/castillo-semantic-map";
import { CalibracionReino } from "@/components/ludus/calibracion-reino";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBabel } from "@/components/babel/babel-context";
import { CastilloProjectsWidget } from "@/components/castillo/castillo-projects-widget";
import {
  ArrowLeftIcon,
  CastleIcon,
  CrownIcon,
  LayoutGridIcon,
  NetworkIcon,
  RefreshCwIcon,
  ImageIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/projects/types";
import { SOURCE_TYPE_ACCENTS } from "@/lib/castillo/constants";

type CastilloView = "lienzo" | "mapa";

function CastilloShell() {
  const { universeFetch } = useBabel();
  const { isLoading, isBusy, error, refresh, placeItem } = useCastillo();
  const [view, setView] = useState<CastilloView>("lienzo");
  const [showCalibration, setShowCalibration] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [visionImageUrl, setVisionImageUrl] = useState("");
  const [linkedProjectId, setLinkedProjectId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);

  const linkedProject = useMemo(
    () => projects.find((p) => p.id === linkedProjectId) ?? null,
    [projects, linkedProjectId],
  );

  useEffect(() => {
    if (!showVisionModal) return;
    if (projects.length > 0) return;
    setIsProjectsLoading(true);
    void universeFetch("/api/proyectos", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar proyectos.");
        const data = (await res.json()) as { projects?: Project[] };
        const loaded = data.projects ?? [];
        setProjects(loaded);
        setLinkedProjectId((current) => current || loaded[0]?.id || "");
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => {
        setIsProjectsLoading(false);
      });
  }, [projects.length, showVisionModal, universeFetch]);

  const handleCreateVisionCard = async () => {
    const imageUrl = visionImageUrl.trim();
    if (!imageUrl) {
      return;
    }
    await placeItem({
      sourceType: "vision_image",
      sourceId: imageUrl,
      title: "Visión",
      subtitle: linkedProject ? linkedProject.title : null,
      accentHint: SOURCE_TYPE_ACCENTS.vision_image,
      deepLink: linkedProjectId
        ? `/proyectos?highlight=${linkedProjectId}`
        : "/ludus/castillo",
      meta: {
        imageUrl,
        linkedProjectId: linkedProjectId || null,
      },
      placed: false,
    });

    setShowVisionModal(false);
    setVisionImageUrl("");
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-4 border-b border-border px-4 py-3 sm:px-5">
        <Link
          href="/ludus"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <ArrowLeftIcon className="size-3.5" />
          Mapa
        </Link>

        <div className="flex items-center gap-2">
          <CastleIcon className="size-4 text-accent" aria-hidden />
          <div>
            <h1 className="text-sm font-semibold text-foreground">Castillo</h1>
            <p className="font-mono text-[10px] text-muted-foreground">
              Alpha · Vista de pájaro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setView("lienzo")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
              view === "lienzo"
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-muted-foreground",
            )}
          >
            <LayoutGridIcon className="size-3" />
            Lienzo
          </button>
          <button
            type="button"
            onClick={() => setView("mapa")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
              view === "mapa"
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-muted-foreground",
            )}
          >
            <NetworkIcon className="size-3" />
            Mapa
          </button>
        </div>

        <Link
          href="/ludus/mago"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "ml-auto border-border bg-card/80 text-xs text-muted-foreground hover:border-accent/30 hover:bg-accent/10 hover:text-accent",
          )}
        >
          <SparklesIcon className="size-3.5" />
          Mago
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-accent/30 bg-accent/10 text-xs text-accent hover:bg-accent/20"
          onClick={() => setShowCalibration(true)}
        >
          <CrownIcon className="size-3.5" />
          Calibración del Reino
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-primary/30 bg-primary/10 text-xs text-primary hover:bg-primary/20"
          onClick={() => setShowVisionModal(true)}
          disabled={isBusy}
        >
          <ImageIcon className="size-3.5" />
          Nueva visión
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          onClick={() => void refresh()}
          disabled={isBusy}
          aria-label="Actualizar"
        >
          <RefreshCwIcon
            className={isLoading || isBusy ? "animate-spin" : ""}
          />
        </Button>
      </header>

      {error ? (
        <p className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {view === "lienzo" ? (
          <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/80 transition-opacity duration-300 lg:w-80">
            <CastilloGridTabs />
            <CastilloProjectsWidget />
            <CastilloCatalogPanel />
          </aside>
        ) : null}
        <main className="min-w-0 flex-1 overflow-hidden transition-opacity duration-300">
          {view === "mapa" ? <CastilloSemanticMap /> : <CastilloCanvas />}
        </main>
      </div>

      {showCalibration ? (
        <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-foreground/40 backdrop-blur-sm pt-8 pb-16">
          <div className="castillo-card mx-4 w-full max-w-4xl border border-accent/20 p-2 shadow-2xl">
            <CalibracionReino
              embedded
              onClose={() => setShowCalibration(false)}
            />
          </div>
        </div>
      ) : null}

      {showVisionModal ? (
        <div className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto bg-foreground/40 backdrop-blur-sm pt-8 pb-16">
          <div className="castillo-card mx-4 w-full max-w-2xl border border-primary/20 p-2 shadow-2xl">
            <div className="border-b border-border px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Vision Board
              </p>
              <h2 className="mt-1 text-sm font-semibold text-foreground">Agregar imagen</h2>
            </div>

            <div className="space-y-3 px-4 py-4">
              <label className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  URL de imagen
                </span>
                <input
                  value={visionImageUrl}
                  onChange={(e) => setVisionImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Vincular a proyecto (opcional)
                </span>
                {isProjectsLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando proyectos…</p>
                ) : (
                  <select
                    value={linkedProjectId}
                    onChange={(e) => setLinkedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="">Sin vínculo</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowVisionModal(false)}
                disabled={isBusy}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreateVisionCard()}
                disabled={isBusy || !visionImageUrl.trim()}
              >
                Crear
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CastilloWorkspace() {
  return (
    <CastilloProvider>
      <CastilloShell />
    </CastilloProvider>
  );
}
