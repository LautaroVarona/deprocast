"use client";

import { CampoSelect } from "@/components/proyectos/campo-select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { type CampoInfo, type CampoSlug } from "@/lib/projects/campos";
import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ClockIcon,
  FlameIcon,
  FolderKanbanIcon,
  Loader2Icon,
  NotebookPenIcon,
  TargetIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ProjectDetailSheetProps = {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressAdded?: () => void;
  onCampoChanged?: () => void;
};

export function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
  onProgressAdded,
  onCampoChanged,
}: ProjectDetailSheetProps) {
  const [progressNote, setProgressNote] = useState("");
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [campos, setCampos] = useState<CampoInfo[]>([]);
  const [campoSlug, setCampoSlug] = useState<CampoSlug>("babel");
  const [isChangingCampo, setIsChangingCampo] = useState(false);

  useEffect(() => {
    if (!project) return;
    setCampoSlug(project.campoSlug);
  }, [project]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const response = await fetch("/api/proyectos", { cache: "no-store" });
        if (!response.ok) return;
        const data: { campos?: CampoInfo[] } = await response.json();
        if (data.campos?.length) setCampos(data.campos);
      } catch {
        // ignore
      }
    })();
  }, [open]);

  if (!project) return null;

  const isCritical = isHighPriorityProject(project.prioridad, project.impacto);
  const campoChanged = campoSlug !== project.campoSlug;

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
      onProgressAdded?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo registrar el progreso.",
      );
    } finally {
      setIsAddingProgress(false);
    }
  };

  const handleChangeCampo = async () => {
    if (!campoChanged) return;

    setIsChangingCampo(true);
    try {
      const response = await fetch(`/api/proyectos/${project.id}/campo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campoSlug }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo reasignar el Campo.");
      }
      toast.success("Proyecto vinculado al nuevo Campo.");
      onCampoChanged?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo reasignar el Campo.",
      );
    } finally {
      setIsChangingCampo(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title={project.title}
        description={`${project.campo} · ${project.estado}`}
        onClose={() => onOpenChange(false)}
      />

      <SheetBody className="space-y-4">
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 font-mono text-[10px]",
            isCritical
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-muted/50 text-muted-foreground",
          )}
        >
          {isCritical && <FlameIcon className="size-3" />}
          <span>P{project.prioridad}</span>
          <span>·</span>
          <span>I{project.impacto}</span>
          <span>·</span>
          <span>D{project.dificultad}</span>
          <span>·</span>
          <span>{project.id.slice(0, 8)}</span>
          <span>·</span>
          <span>{project.avancePorcentaje}%</span>
          <span>·</span>
          <span>
            {project.horasRealizadas}/{project.horasEstimadas}h
          </span>
        </div>

        {project.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            <FolderKanbanIcon className="size-3" />
            Campo
          </p>
          <CampoSelect
            value={campoSlug}
            onChange={setCampoSlug}
            campos={campos}
            allowCreate={false}
            label=""
          />
          {campoChanged && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full font-mono text-[10px]"
              disabled={isChangingCampo}
              onClick={() => void handleChangeCampo()}
            >
              {isChangingCampo ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <FolderKanbanIcon />
              )}
              Mover a este Campo
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-muted-foreground">
          {project.fechaInicio && (
            <div className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5">
              <CalendarIcon className="size-3" />
              Inicio {project.fechaInicio}
            </div>
          )}
          {project.fechaObjetivo && (
            <div className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5">
              <TargetIcon className="size-3" />
              Objetivo {project.fechaObjetivo}
            </div>
          )}
          {project.responsable && (
            <div className="col-span-2 flex items-center gap-1.5 rounded border border-border px-2 py-1.5">
              <ClockIcon className="size-3" />
              {project.responsable}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            Bitácora de progreso
          </p>
          {project.progressEntries.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center font-mono text-[10px] text-muted-foreground">
              Sin entradas todavía
            </p>
          ) : (
            <ul className="space-y-2">
              {[...project.progressEntries].reverse().map((entry, index) => (
                <li
                  key={`${entry.fecha}-${index}`}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <p className="font-mono text-[9px] text-muted-foreground">{entry.fecha}</p>
                  <p className="mt-1 text-xs leading-relaxed">{entry.nota}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetBody>

      <SheetFooter>
        <div className="space-y-2">
          <textarea
            value={progressNote}
            onChange={(event) => setProgressNote(event.target.value)}
            placeholder="Nueva entrada para la bitácora..."
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={isAddingProgress}
            onClick={() => void handleAddProgress()}
          >
            {isAddingProgress ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <NotebookPenIcon />
            )}
            Registrar progreso
          </Button>
        </div>
      </SheetFooter>
    </Sheet>
  );
}
