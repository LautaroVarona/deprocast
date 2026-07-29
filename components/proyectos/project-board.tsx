"use client";

import { ProjectDetailSheet } from "@/components/proyectos/project-detail-sheet";
import { ProjectRow } from "@/components/proyectos/project-row";
import { DEFAULT_CAMPO_SLUG, type CampoInfo } from "@/lib/projects/campos";
import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { FolderKanbanIcon, Loader2Icon, SkullIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProjectBoardProps = {
  projects: Project[];
  campos: CampoInfo[];
  isLoading: boolean;
  onRefresh: () => void;
};

function groupByCampo(
  projects: Project[],
  campos: CampoInfo[],
): Map<string, Project[]> {
  const groups = new Map<string, Project[]>();

  for (const campo of campos) {
    groups.set(campo.slug, []);
  }

  for (const project of projects) {
    const list = groups.get(project.campoSlug) ?? [];
    list.push(project);
    groups.set(project.campoSlug, list);
  }

  return groups;
}

export function ProjectBoard({
  projects,
  campos,
  isLoading,
  onRefresh,
}: ProjectBoardProps) {
  const grouped = useMemo(() => groupByCampo(projects, campos), [projects, campos]);
  const [activeCampo, setActiveCampo] = useState(DEFAULT_CAMPO_SLUG);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (campos.some((campo) => campo.slug === activeCampo)) return;
    setActiveCampo(campos[0]?.slug ?? DEFAULT_CAMPO_SLUG);
  }, [campos, activeCampo]);

  const activeCampoInfo = campos.find((campo) => campo.slug === activeCampo);
  const activeProjects = grouped.get(activeCampo) ?? [];
  const criticalCount = activeProjects.filter((project) =>
    isHighPriorityProject(project.prioridad, project.impacto),
  ).length;

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2Icon className="size-5 animate-spin text-amber-500/70" aria-hidden />
        <p className="font-mono text-[11px] tracking-wide">Cargando command center…</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap gap-1.5" role="tablist" aria-label="Campos">
          {campos.map((campo) => {
            const count = grouped.get(campo.slug)?.length ?? 0;
            const isActive = activeCampo === campo.slug;

            return (
              <button
                key={campo.slug}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCampo(campo.slug)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                  isActive
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                )}
              >
                <FolderKanbanIcon className="size-3" aria-hidden />
                {campo.label}
                <span className="tabular-nums text-amber-500/80">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 pb-2">
          <div className="min-w-0">
            <h2 className="truncate font-mono text-xs font-semibold tracking-wide text-zinc-100">
              {activeCampoInfo?.label}
            </h2>
            <p className="font-mono text-[10px] text-zinc-500">
              {activeProjects.length === 0
                ? "sin proyectos"
                : `${activeProjects.length} activos · ${criticalCount} críticos`}
            </p>
          </div>
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">
              <SkullIcon className="size-3" />
              {criticalCount} boss
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {activeProjects.length === 0 ? (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-sm border border-dashed border-zinc-800 text-center">
              <FolderKanbanIcon className="mb-2 size-5 text-zinc-600" aria-hidden />
              <p className="font-mono text-[10px] tracking-wide text-zinc-500 uppercase">
                Campo vacío
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {activeProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onSelect={handleSelectProject}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProjectDetailSheet
        project={selectedProject}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onProgressAdded={onRefresh}
        onCampoChanged={onRefresh}
      />
    </>
  );
}
