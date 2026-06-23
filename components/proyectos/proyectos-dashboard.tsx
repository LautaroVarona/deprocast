"use client";

import { CamposWorkspace } from "@/components/proyectos/campos-workspace";
import { ProjectBoard } from "@/components/proyectos/project-board";
import { ProposalsWorkspace } from "@/components/proyectos/proposals-workspace";
import { buttonVariants } from "@/components/ui/button";
import { getDefaultCampo, type CampoInfo } from "@/lib/projects/campos";
import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { InboxIcon, TerminalIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardView = "activos" | "campos" | "propuestas" | "archivo";

function parseView(value: string | null): DashboardView {
  if (value === "campos" || value === "propuestas" || value === "archivo") return value;
  return "activos";
}

export function ProyectosDashboard() {
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get("view"));

  const [projects, setProjects] = useState<Project[]>([]);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingProposals, setPendingProposals] = useState(0);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/proyectos", { cache: "no-store" });
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
  }, []);

  const loadPendingCount = useCallback(async () => {
    try {
      const response = await fetch("/api/proyectos/proposals?status=pending", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data: { proposals: unknown[] } = await response.json();
      setPendingProposals(data.proposals.length);
    } catch {
      setPendingProposals(0);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    void loadPendingCount();
  }, [loadProjects, loadPendingCount, refreshKey]);

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

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <TerminalIcon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Atanor · Proyectos
            </p>
            <h1 className="truncate text-sm font-semibold">
              {view === "campos"
                ? "Gestión de Campos"
                : view === "propuestas"
                  ? "Incubadora de propuestas"
                  : view === "archivo"
                    ? "Ideas archivadas"
                    : "Tablero por Campos"}
            </h1>
          </div>
        </div>
        <Link
          href="/proyectos/nuevo"
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          <InboxIcon />
          Captura rápida
        </Link>
      </header>

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 sm:px-6">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "relative inline-flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[10px] tracking-wide uppercase transition-colors",
              view === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground tabular-nums">
                {tab.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {view === "activos" && (
        <>
          <div className="flex shrink-0 items-center gap-4 border-b border-border px-4 py-2 font-mono text-[10px] text-muted-foreground sm:px-6">
            <span>
              <span className="text-foreground">{stats.total}</span> proyectos
            </span>
            <span className="text-border">│</span>
            <span>
              <span className="text-destructive">{stats.critical}</span> críticos
            </span>
            <span className="text-border">│</span>
            <span>
              <span className="text-foreground">{stats.campos}</span> campos
            </span>
            <span className="text-border">│</span>
            <span>
              avance medio <span className="text-foreground">{stats.avgProgress}%</span>
            </span>
            <span className="ml-auto hidden text-muted-foreground/70 md:inline">
              data/projects/&lt;campo&gt;/&lt;id&gt;.md
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
            <ProjectBoard
              projects={projects}
              campos={campos}
              isLoading={isLoading}
              onRefresh={() => setRefreshKey((key) => key + 1)}
            />
          </div>
        </>
      )}

      {view === "campos" && (
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
          <CamposWorkspace onRefresh={() => setRefreshKey((key) => key + 1)} />
        </div>
      )}

      {view === "propuestas" && (
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
          <ProposalsWorkspace
            status="pending"
            onPendingCountChange={setPendingProposals}
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
