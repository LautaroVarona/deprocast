"use client";

import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { CalendarIcon, FlameIcon, GaugeIcon, TimerIcon } from "lucide-react";

type ProjectRowProps = {
  project: Project;
  onSelect: (project: Project) => void;
};

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 font-mono text-amber-500 tabular-nums">
      <span className="text-[9px] tracking-wider text-amber-500/60 uppercase">{label}</span>
      <span className="text-[11px] font-semibold">{value}</span>
    </span>
  );
}

export function ProjectRow({ project, onSelect }: ProjectRowProps) {
  const isCritical = isHighPriorityProject(project.prioridad, project.impacto);

  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className={cn(
        "group flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors",
        "rounded-sm font-mono text-[11px]",
        isCritical
          ? "border-amber-500/40 bg-amber-500/5 text-zinc-200 shadow-[inset_2px_0_0_0] shadow-amber-500 hover:border-amber-500/60 hover:bg-amber-500/10"
          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-200",
      )}
    >
      {isCritical ? (
        <FlameIcon className="size-3.5 shrink-0 text-amber-500" aria-hidden />
      ) : (
        <span
          className="size-3.5 shrink-0 rounded-sm border border-zinc-700 bg-zinc-950"
          aria-hidden
        />
      )}

      <span className="flex shrink-0 items-center gap-2 border-r border-zinc-800 pr-3">
        <Metric label="P" value={project.prioridad} />
        <Metric label="I" value={project.impacto} />
        <Metric label="D" value={project.dificultad} />
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[12px]",
          isCritical
            ? "font-medium text-zinc-100"
            : "text-zinc-200 group-hover:text-zinc-50",
        )}
      >
        {project.title}
      </span>

      <span className="hidden shrink-0 items-center gap-1 tabular-nums text-zinc-500 sm:inline-flex">
        <GaugeIcon className="size-3" aria-hidden />
        {project.avancePorcentaje}%
      </span>

      <span className="hidden shrink-0 items-center gap-1 tabular-nums text-zinc-500 md:inline-flex">
        <TimerIcon className="size-3" aria-hidden />
        {project.horasRealizadas}/{project.horasEstimadas}h
      </span>

      {project.fechaObjetivo && (
        <span className="hidden shrink-0 items-center gap-1 text-zinc-500 lg:inline-flex">
          <CalendarIcon className="size-3" aria-hidden />
          {project.fechaObjetivo}
        </span>
      )}

      <span
        className={cn(
          "shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] tracking-[0.14em] uppercase",
          isCritical
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
            : "border-zinc-800 bg-zinc-950 text-zinc-500",
        )}
      >
        {project.estado}
      </span>
    </button>
  );
}
