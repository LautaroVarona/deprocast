"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  FlameIcon,
  Loader2Icon,
  NotebookPenIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ProjectCardProps = {
  project: Project;
  onProgressAdded?: () => void;
};

const STATUS_COLORS: Record<string, string> = {
  Idea: "bg-slate-500/15 text-slate-700 dark:text-slate-200",
  Diseño: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
  Desarrollo: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
  Pruebas: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  Implantado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  Descartado: "bg-muted text-muted-foreground",
};

export function ProjectCard({ project, onProgressAdded }: ProjectCardProps) {
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressNote, setProgressNote] = useState("");
  const isCritical = isHighPriorityProject(project.prioridad, project.impacto);

  const handleAddProgress = async () => {
    if (!progressNote.trim()) {
      toast.error("Escribí una nota para la bitácora.");
      return;
    }

    setIsAddingProgress(true);
    try {
      const response = await fetch(`/api/proyectos/${project.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: progressNote.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar el progreso.");
      }

      toast.success("Entrada añadida a la bitácora.");
      setProgressNote("");
      setShowProgressForm(false);
      onProgressAdded?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo registrar el progreso.";
      toast.error(message);
    } finally {
      setIsAddingProgress(false);
    }
  };

  return (
    <Card
      className={cn(
        "transition-all hover:-translate-y-0.5 hover:shadow-md",
        isCritical &&
          "border-2 border-red-500 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-amber-500/5 shadow-[0_0_24px_rgba(239,68,68,0.35)] ring-2 ring-red-500/40",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm leading-snug">
            {project.title}
          </CardTitle>
          {isCritical && (
            <FlameIcon className="size-4 shrink-0 text-red-500" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="font-mono text-[10px]">
            {project.id.slice(0, 8)}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "font-semibold tabular-nums",
              isCritical && "border-red-500 bg-red-500/20 text-red-700 dark:text-red-200",
            )}
          >
            P {project.prioridad} · I {project.impacto}
          </Badge>
          <Badge
            className={cn(STATUS_COLORS[project.estado] ?? STATUS_COLORS.Idea)}
          >
            {project.estado}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Avance</span>
          <span className="font-semibold tabular-nums text-foreground">
            {project.avancePorcentaje}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isCritical ? "bg-red-500" : "bg-primary",
            )}
            style={{ width: `${project.avancePorcentaje}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Horas</span>
          <span className="tabular-nums text-foreground">
            {project.horasRealizadas} / {project.horasEstimadas}
          </span>
        </div>
        {project.responsable && (
          <div className="flex items-center gap-1.5 pt-1 text-foreground/80">
            <UserIcon className="size-3.5 shrink-0" />
            <span className="truncate">{project.responsable}</span>
          </div>
        )}
        {project.fechaObjetivo && (
          <div className="flex items-center gap-1.5 text-foreground/80">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span>Objetivo: {project.fechaObjetivo}</span>
          </div>
        )}
        {project.metaTagsSecundarios.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {project.metaTagsSecundarios.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2">
        {showProgressForm ? (
          <div className="w-full space-y-2">
            <textarea
              value={progressNote}
              onChange={(event) => setProgressNote(event.target.value)}
              placeholder="Nueva entrada para la bitácora..."
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={isAddingProgress}
                onClick={() => void handleAddProgress()}
              >
                {isAddingProgress ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <NotebookPenIcon />
                )}
                Registrar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowProgressForm(false);
                  setProgressNote("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowProgressForm(true)}
          >
            <NotebookPenIcon />
            Añadir progreso
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
