"use client";

import { useBabel } from "@/components/babel/babel-context";
import { CamposWorkspace } from "@/components/proyectos/campos-workspace";
import { IngestaProyectoModal } from "@/components/proyectos/ingesta-proyecto-modal";
import { JsonInjector } from "@/components/proyectos/json-injector";
import { ProjectBoard } from "@/components/proyectos/project-board";
import { ProposalsWorkspace } from "@/components/proyectos/proposals-workspace";
import { useDomainRefresh } from "@/hooks/use-domain-refresh";
import { getDefaultCampo, type CampoInfo } from "@/lib/projects/campos";
import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { BracesIcon, InboxIcon, TerminalIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardView = "activos" | "campos" | "propuestas" | "archivo";

const PROYECTOS_REFRESH_SCOPES = ["proyectos", "kg"] as const;

function parseView(value: string | null): DashboardView {
  if (value === "campos" || value === "propuestas" || value === "archivo") return value;
  return "activos";
}

export function ProyectosDashboard() {
  const searchParams = useSearchParams();
  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();
  const view = parseView(searchParams.get("view"));

  const [projects, setProjects] = useState<Project[]>([]);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingProposals, setPendingProposals] = useState(0);
  const [ingestaOpen, setIngestaOpen] = useState(false);
  const [jsonIoOpen, setJsonIoOpen] = useState(false);
  const domainRefreshKey = useDomainRefresh(PROYECTOS_REFRESH_SCOPES);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await universeFetch("/api/proyectos", { cache: "no-store" });
      if (!response.ok) return;
      const data: { projects: Project[]; campos?: CampoInfo[] } =
        await response.json();
      setProjects(data.projects);
      setCampos(data.campos?.length ? data.campos : [getDefaultCampo()]);
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  const loadPendingCount = useCallback(async () => {
    try {
      const response = await universeFetch("/api/proyectos/proposals?status=pending", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data: { proposals: unknown[] } = await response.json();
      setPendingProposals(data.proposals.length);
    } catch {
      setPendingProposals(0);
    }
  }, [universeFetch]);

  useEffect(() => {
    setProjects([]);
    setCampos([getDefaultCampo()]);
  }, [universeSlug]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void loadProjects();
    void loadPendingCount();
  }, [loadProjects, loadPendingCount, refreshKey, domainRefreshKey, universeSlug, isUniverseLoading]);

  const stats = useMemo(() => {
    const critical = projects.filter((p) =>
      isHighPriorityProject(p.prioridad, p.impacto),
    ).length;
    const avgProgress =
      projects.length > 0
        ? Math.round(
            projects.reduce((sum, p) => sum + p.avancePorcentaje, 0) /
              projects.length,
          )
        : 0;
    return { total: projects.length, critical, campos: campos.length, avgProgress };
  }, [projects, campos.length]);

  const tabs: { id: DashboardView; label: string; href: string; badge?: number }[] = [
    { id: "activos", label: "Activos", href: "/proyectos" },
    { id: "campos", label: "Campos", href: "/proyectos?view=campos" },
    {
      id: "propuestas",
      label: "Propuestas",
      href: "/proyectos?view=propuestas",
      badge: pendingProposals,
    },
    { id: "archivo", label: "Archivo", href: "/proyectos?view=archivo" },
  ];

  const bumpRefresh = () => setRefreshKey((key) => key + 1);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-zinc-800 bg-zinc-900 text-amber-500">
            <TerminalIcon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.22em] text-amber-500/70 uppercase">
              Atanor · Command Center
            </p>
            <h1 className="truncate font-mono text-sm font-semibold tracking-tight text-zinc-100">
              {view === "campos"
                ? "Gestión de Campos"
                : view === "propuestas"
                  ? "Incubadora de propuestas"
                  : view === "archivo"
                    ? "Ideas archivadas"
                    : "Tablero táctico"}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setJsonIoOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm border border-amber-500/40 bg-amber-500/15",
              "px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-amber-400 uppercase",
              "transition-colors hover:bg-amber-500/25",
            )}
          >
            <BracesIcon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{"{ }"} I/O Códice JSON</span>
            <span className="sm:hidden">{"{ }"} I/O</span>
          </button>
          <button
            type="button"
            onClick={() => setIngestaOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm border border-zinc-700 bg-zinc-900",
              "px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-300 uppercase",
              "transition-colors hover:border-zinc-600 hover:text-zinc-100",
            )}
          >
            <InboxIcon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Nuevo Proyecto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </header>

      <IngestaProyectoModal
        open={ingestaOpen}
        onOpenChange={setIngestaOpen}
        onCoagulated={bumpRefresh}
      />

      <JsonInjector
        open={jsonIoOpen}
        onOpenChange={setJsonIoOpen}
        onImported={bumpRefresh}
      />

      <div className="flex shrink-0 items-center gap-1 border-b border-zinc-800 px-4 sm:px-6">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "relative inline-flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[10px] tracking-wide uppercase transition-colors",
              view === tab.id
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300",
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 tabular-nums">
                {tab.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {view === "activos" && (
        <>
          <div className="flex shrink-0 items-center gap-4 border-b border-zinc-800 px-4 py-2 font-mono text-[10px] text-zinc-500 sm:px-6">
            <span>
              <span className="text-amber-500">{stats.total}</span> proyectos
            </span>
            <span className="text-zinc-800">│</span>
            <span>
              <span className="text-amber-400">{stats.critical}</span> críticos
            </span>
            <span className="text-zinc-800">│</span>
            <span>
              <span className="text-zinc-200">{stats.campos}</span> campos
            </span>
            <span className="text-zinc-800">│</span>
            <span>
              avance medio <span className="text-zinc-200">{stats.avgProgress}%</span>
            </span>
            <span className="ml-auto hidden text-zinc-600 md:inline">
              data/projects/&lt;campo&gt;/&lt;id&gt;.md
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
            <ProjectBoard
              projects={projects}
              campos={campos}
              isLoading={isLoading}
              onRefresh={bumpRefresh}
            />
          </div>
        </>
      )}

      {view === "campos" && (
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
          <CamposWorkspace
            refreshKey={refreshKey}
            onRefresh={bumpRefresh}
          />
        </div>
      )}

      {view === "propuestas" && (
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
          <ProposalsWorkspace
            status="pending"
            onPendingCountChange={setPendingProposals}
            onProposalActivated={bumpRefresh}
          />
        </div>
      )}

      {view === "archivo" && (
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
          <ProposalsWorkspace status="archived" />
        </div>
      )}
    </div>
  );
}
