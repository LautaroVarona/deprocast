"use client";

import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { CalendarIcon, FlameIcon, GaugeIcon, HashIcon, TimerIcon } from "lucide-react";

type ProjectRowProps = {
  project: Project;
  onSelect: (project: Project) => void;
};

export function ProjectRow({ project, onSelect }: ProjectRowProps) {
  const isCritical = isHighPriorityProject(project.prioridad, project.impacto);

  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left font-mono text-[11px] transition-colors",
        isCritical
          ? "border-destructive/50 bg-destructive/10 text-foreground shadow-[inset_0_0_0_1px] shadow-destructive/15 hover:border-destructive/70 hover:bg-destructive/15"
          : "border-border bg-card/60 text-muted-foreground hover:border-ring hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {isCritical ? (
        <FlameIcon className="size-3.5 shrink-0 text-destructive" aria-hidden />
      ) : (
        <span className="size-3.5 shrink-0 rounded-sm border border-border" aria-hidden />
      )}

      <span
        className={cn(
          "shrink-0 tabular-nums",
          isCritical ? "font-semibold text-destructive" : "",
        )}
      >
        P{project.prioridad}·I{project.impacto}
      </span>

      <span className="shrink-0 text-border">│</span>

      <span className="inline-flex shrink-0 items-center gap-1">
        <HashIcon className="size-3" aria-hidden />
        {project.id.slice(0, 8)}
      </span>

      <span className="shrink-0 text-border">│</span>

      <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
        <GaugeIcon className="size-3" aria-hidden />
        {project.avancePorcentaje}%
      </span>

      <span className="shrink-0 text-border">│</span>

      <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
        <TimerIcon className="size-3" aria-hidden />
        {project.horasRealizadas}/{project.horasEstimadas}h
      </span>

      {project.fechaObjetivo && (
        <>
          <span className="shrink-0 text-border">│</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <CalendarIcon className="size-3" aria-hidden />
            {project.fechaObjetivo}
          </span>
        </>
      )}

      <span className="shrink-0 text-border">│</span>

      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
          isCritical ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground",
        )}
      >
        {project.estado}
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          isCritical ? "font-medium" : "text-foreground/90 group-hover:text-foreground",
        )}
      >
        {project.title}
      </span>
    </button>
  );
}
