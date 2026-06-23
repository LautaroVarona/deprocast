"use client";

import { CampoForm } from "@/components/proyectos/campo-form";
import { CampoSelect } from "@/components/proyectos/campo-select";
import { Button } from "@/components/ui/button";
import { DEFAULT_CAMPO_SLUG, type Campo, type CampoInfo } from "@/lib/projects/campos";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import {
  FolderKanbanIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CamposWorkspaceProps = {
  onRefresh?: () => void;
};

export function CamposWorkspace({ onRefresh }: CamposWorkspaceProps) {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [projectsByCampo, setProjectsByCampo] = useState<Record<string, Project[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [assigningProjectId, setAssigningProjectId] = useState<string | null>(null);
  const [targetCampoSlug, setTargetCampoSlug] = useState(DEFAULT_CAMPO_SLUG);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadCampos = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/campos", { cache: "no-store" });
      if (!response.ok) return;
      const data: {
        campos: Campo[];
        projectsByCampo: Record<string, Project[]>;
      } = await response.json();
      setCampos(data.campos);
      setProjectsByCampo(data.projectsByCampo ?? {});
      setSelectedSlug((current) => current ?? data.campos[0]?.slug ?? null);
    } catch {
      setCampos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampos();
  }, [loadCampos]);

  const selectedCampo = useMemo(
    () => campos.find((campo) => campo.slug === selectedSlug) ?? null,
    [campos, selectedSlug],
  );

  const selectedProjects = selectedSlug ? (projectsByCampo[selectedSlug] ?? []) : [];
  const unassignedInBabel = useMemo(() => {
    const babelProjects = projectsByCampo[DEFAULT_CAMPO_SLUG] ?? [];
    return babelProjects;
  }, [projectsByCampo]);

  const campoInfos: CampoInfo[] = useMemo(
    () => campos.map(({ slug, label, count, description }) => ({ slug, label, count, description })),
    [campos],
  );

  const handleSaved = () => {
    setIsCreating(false);
    setIsEditing(false);
    void loadCampos();
    onRefresh?.();
  };

  const handleAssignProject = async (projectId: string) => {
    setIsAssigning(true);
    try {
      const response = await fetch(`/api/proyectos/${projectId}/campo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campoSlug: targetCampoSlug }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo reasignar el proyecto.");
      }
      toast.success("Proyecto vinculado al Campo.");
      setAssigningProjectId(null);
      void loadCampos();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al vincular proyecto.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2Icon className="size-6 animate-spin" aria-hidden />
        <p className="font-mono text-[11px]">Cargando Campos...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-64">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            Campos ({campos.length})
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 font-mono text-[10px]"
            onClick={() => {
              setIsCreating(true);
              setIsEditing(false);
            }}
          >
            <PlusIcon className="size-3" />
            Nuevo
          </Button>
        </div>

        <div className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto lg:max-h-none lg:flex-1">
          {campos.map((campo) => (
            <button
              key={campo.slug}
              type="button"
              onClick={() => {
                setSelectedSlug(campo.slug);
                setIsCreating(false);
                setIsEditing(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                selectedSlug === campo.slug
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 hover:border-ring",
              )}
            >
              <FolderKanbanIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-medium">{campo.label}</p>
                <p className="font-mono text-[9px] text-muted-foreground">
                  {campo.count} proyecto{campo.count === 1 ? "" : "s"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        {isCreating && <CampoForm onSaved={handleSaved} onCancel={() => setIsCreating(false)} />}

        {selectedCampo && !isCreating && (
          <>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-mono text-sm font-semibold">{selectedCampo.label}</h2>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {selectedCampo.slug}
                    {selectedCampo.createdAt ? ` · desde ${selectedCampo.createdAt}` : ""}
                  </p>
                  {selectedCampo.description && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {selectedCampo.description}
                    </p>
                  )}
                </div>
                {selectedCampo.slug !== DEFAULT_CAMPO_SLUG && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 font-mono text-[10px]"
                    onClick={() => setIsEditing((value) => !value)}
                  >
                    <PencilIcon className="size-3" />
                    Editar
                  </Button>
                )}
              </div>
            </div>

            {isEditing && (
              <CampoForm
                campo={selectedCampo}
                onSaved={handleSaved}
                onCancel={() => setIsEditing(false)}
              />
            )}

            <div className="space-y-2">
              <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                Proyectos en este Campo
              </p>
              {selectedProjects.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Sin proyectos vinculados
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {selectedProjects.map((project) => (
                    <li
                      key={project.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{project.title}</p>
                        <p className="font-mono text-[9px] text-muted-foreground">
                          {project.estado} · {project.avancePorcentaje}%
                        </p>
                      </div>
                      {selectedCampo.slug !== project.campoSlug && null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {unassignedInBabel.length > 0 && selectedSlug !== DEFAULT_CAMPO_SLUG && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              Asignación rápida desde Babel
            </p>
            <p className="text-xs text-muted-foreground">
              Proyectos en el sumidero universal listos para vincular a un Campo.
            </p>
            <ul className="space-y-1">
              {unassignedInBabel.slice(0, 5).map((project) => (
                <li
                  key={project.id}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium">{project.title}</p>
                    {assigningProjectId === project.id ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <CampoSelect
                          value={targetCampoSlug}
                          onChange={setTargetCampoSlug}
                          campos={campoInfos.filter((c) => c.slug !== DEFAULT_CAMPO_SLUG)}
                          allowCreate={false}
                          label="Destino"
                          className="min-w-[180px]"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={isAssigning}
                          onClick={() => void handleAssignProject(project.id)}
                        >
                          {isAssigning ? <Loader2Icon className="animate-spin" /> : "Vincular"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAssigningProjectId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="font-mono text-[10px]"
                        onClick={() => {
                          setAssigningProjectId(project.id);
                          setTargetCampoSlug(selectedSlug ?? DEFAULT_CAMPO_SLUG);
                        }}
                      >
                        Asignar aquí
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
