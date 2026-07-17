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
      <header className="flex shrink-0 items-center gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
        <Link
          href="/ludus"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-white/60 hover:bg-white/5 hover:text-white",
          )}
        >
          <ArrowLeftIcon className="size-3.5" />
          Mapa
        </Link>

        <div className="flex items-center gap-2">
          <CastleIcon className="size-4 text-amber-300/80" aria-hidden />
          <div>
            <h1 className="text-sm font-semibold text-white">Castillo</h1>
            <p className="font-mono text-[10px] text-white/35">
              Alpha · Vista de pájaro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/30 p-0.5">
          <button
            type="button"
            onClick={() => setView("lienzo")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
              view === "lienzo"
                ? "bg-amber-500/20 text-amber-100"
                : "text-white/40 hover:text-white/70",
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
                ? "bg-amber-500/20 text-amber-100"
                : "text-white/40 hover:text-white/70",
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
            "ml-auto border-white/15 bg-black/40 text-xs text-white/70 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-100",
          )}
        >
          <SparklesIcon className="size-3.5" />
          Mago
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 hover:bg-amber-500/20"
          onClick={() => setShowCalibration(true)}
        >
          <CrownIcon className="size-3.5" />
          Calibración del Reino
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-violet-500/30 bg-violet-500/10 text-xs text-violet-200 hover:bg-violet-500/20"
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
          className="text-white/50 hover:bg-white/5 hover:text-white"
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
        <p className="shrink-0 border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {view === "lienzo" ? (
          <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 bg-black/25 transition-opacity duration-300 lg:w-80">
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
        <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm pt-8 pb-16">
          <div className="castillo-card mx-4 w-full max-w-4xl border border-amber-500/20 p-2 shadow-2xl">
            <CalibracionReino
              embedded
              onClose={() => setShowCalibration(false)}
            />
          </div>
        </div>
      ) : null}

      {showVisionModal ? (
        <div className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm pt-8 pb-16">
          <div className="castillo-card mx-4 w-full max-w-2xl border border-violet-500/20 p-2 shadow-2xl">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Vision Board
              </p>
              <h2 className="mt-1 text-sm font-semibold text-white">Agregar imagen</h2>
            </div>

            <div className="space-y-3 px-4 py-4">
              <label className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                  URL de imagen
                </span>
                <input
                  value={visionImageUrl}
                  onChange={(e) => setVisionImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                  Vincular a proyecto (opcional)
                </span>
                {isProjectsLoading ? (
                  <p className="text-sm text-white/50">Cargando proyectos…</p>
                ) : (
                  <select
                    value={linkedProjectId}
                    onChange={(e) => setLinkedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
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

            <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
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
