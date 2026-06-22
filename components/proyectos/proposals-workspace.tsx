"use client";

import { Button } from "@/components/ui/button";
import {
  FormField,
  inputClassName,
  ScaleSlider,
  textareaClassName,
} from "@/components/proyectos/form-controls";
import {
  PersonBadgeSelect,
  type SelectedPerson,
} from "@/components/proyectos/person-badge-select";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  isCampoSlug,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import {
  PROJECT_TIPOS,
  type ProjectProposal,
  type ProjectTipo,
} from "@/lib/projects/types";
import {
  MATERIA_OPTIONS,
  ORIGEN_OPTIONS,
} from "@/lib/purifier/hitl-metadata";
import { cn } from "@/lib/utils";
import {
  ArchiveIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProposalsWorkspaceProps = {
  status: "pending" | "archived";
  onPendingCountChange?: (count: number) => void;
};

type DensityLevel = "simple" | "moderado" | "completo";

const DENSITY_OPTIONS: { value: DensityLevel; label: string; hint: string }[] = [
  { value: "simple", label: "Simple", hint: "Vibe / rápido" },
  { value: "moderado", label: "Moderado", hint: "Estratégico" },
  { value: "completo", label: "Completo", hint: "Archivista" },
];

const TIPO_LABELS: Record<ProjectTipo, string> = {
  proyecto: "Proyecto",
  reto: "Reto",
  area: "Área",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractGravity(payload: Record<string, unknown> | null): {
  prioridad: number;
  impacto: number;
  dificultad: number;
} {
  const gravity = payload?.gravity as Record<string, unknown> | undefined;
  const dimensions = payload?.dimensions as Record<string, unknown> | undefined;

  return {
    prioridad: Number(gravity?.prioridad ?? dimensions?.prioridad ?? 6),
    impacto: Number(gravity?.impacto ?? dimensions?.impacto ?? 6),
    dificultad: Number(gravity?.dificultad ?? dimensions?.dificultad ?? 6),
  };
}

function extractDimensions(payload: Record<string, unknown> | null): {
  materia: string;
  particula: string;
  onda: string;
  espacio: string;
} {
  const dimensions = payload?.dimensions as Record<string, unknown> | undefined;

  return {
    materia: String(dimensions?.materia ?? "texto"),
    particula: String(payload?.particula ?? dimensions?.particula ?? ""),
    onda: String(dimensions?.onda ?? ""),
    espacio: String(dimensions?.espacio ?? "web"),
  };
}

type ProposalEditorState = {
  densityLevel: DensityLevel;
  mvp: string;
  firstStep: string;
  priorityReason: string;
  tipo: ProjectTipo;
  campoSlug: CampoSlug;
  persons: SelectedPerson[];
  gravity: { prioridad: number; impacto: number; dificultad: number };
  dimensions: { materia: string; particula: string; onda: string; espacio: string };
  expanded: boolean;
};

function defaultEditorState(proposal: ProjectProposal): ProposalEditorState {
  const gravity = extractGravity(proposal.sourcePayload);
  const dimensions = extractDimensions(proposal.sourcePayload);

  return {
    densityLevel: "moderado",
    mvp: proposal.mvp ?? "",
    firstStep: proposal.firstStep ?? "",
    priorityReason: proposal.priorityReason ?? "",
    tipo: proposal.suggestedTipo ?? "proyecto",
    campoSlug:
      proposal.suggestedCampoSlug && isCampoSlug(proposal.suggestedCampoSlug)
        ? proposal.suggestedCampoSlug
        : DEFAULT_CAMPO_SLUG,
    persons: [],
    gravity,
    dimensions,
    expanded: false,
  };
}

function DensityLevelTabs({
  value,
  onChange,
}: {
  value: DensityLevel;
  onChange: (level: DensityLevel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/20 p-1">
      {DENSITY_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-left transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="block font-mono text-[10px] font-semibold tracking-wide uppercase">
              {option.label}
            </span>
            <span
              className={cn(
                "block font-mono text-[9px]",
                isActive ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {option.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ProposalsWorkspace({ status, onPendingCountChange }: ProposalsWorkspaceProps) {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [editors, setEditors] = useState<Record<string, ProposalEditorState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proposalsRes, camposRes] = await Promise.all([
        fetch(`/api/proyectos/proposals?status=${status}`, { cache: "no-store" }),
        fetch("/api/proyectos", { cache: "no-store" }),
      ]);

      if (proposalsRes.ok) {
        const data: { proposals: ProjectProposal[] } = await proposalsRes.json();
        setProposals(data.proposals);
        setEditors((current) => {
          const next = { ...current };
          for (const proposal of data.proposals) {
            if (!next[proposal.id]) {
              next[proposal.id] = defaultEditorState(proposal);
            }
          }
          return next;
        });
        if (status === "pending" && onPendingCountChange) {
          onPendingCountChange(data.proposals.length);
        }
      }

      if (camposRes.ok) {
        const data: { campos?: CampoInfo[] } = await camposRes.json();
        if (data.campos?.length) setCampos(data.campos);
      }
    } catch {
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, onPendingCountChange]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const updateEditor = (id: string, patch: Partial<ProposalEditorState>) => {
    setEditors((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const canActivate = useCallback(
    (id: string) => {
      const editor = editors[id];
      if (!editor) return false;
      if (!PROJECT_TIPOS.includes(editor.tipo) || !isCampoSlug(editor.campoSlug)) {
        return false;
      }

      if (editor.densityLevel === "simple") return true;

      return (
        editor.mvp.trim().length > 0 &&
        editor.firstStep.trim().length > 0 &&
        editor.priorityReason.trim().length > 0
      );
    },
    [editors],
  );

  const handleActivate = async (proposal: ProjectProposal) => {
    const editor = editors[proposal.id];
    if (!editor || !canActivate(proposal.id)) return;

    setActingId(proposal.id);
    try {
      const response = await fetch(`/api/proyectos/proposals/${proposal.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mvp: editor.mvp,
          firstStep: editor.firstStep,
          priorityReason: editor.priorityReason,
          tipo: editor.tipo,
          campoSlug: editor.campoSlug,
          densityLevel: editor.densityLevel,
          personIds: editor.persons.map((person) => person.id),
          gravity: editor.densityLevel === "completo" ? editor.gravity : undefined,
          dimensions: editor.densityLevel === "completo" ? editor.dimensions : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo activar la propuesta.");
      }

      toast.success(`Proyecto activado: ${data.project.title}`);
      await loadProposals();
      router.push("/proyectos");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo activar la propuesta.",
      );
    } finally {
      setActingId(null);
    }
  };

  const handleArchive = async (proposal: ProjectProposal) => {
    setActingId(proposal.id);
    try {
      const response = await fetch(`/api/proyectos/proposals/${proposal.id}/archive`, {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo archivar la propuesta.");
      }

      toast.success("Idea archivada en el histórico latente.");
      await loadProposals();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo archivar la propuesta.",
      );
    } finally {
      setActingId(null);
    }
  };

  const emptyMessage = useMemo(() => {
    if (status === "archived") {
      return "No hay ideas archivadas. Las propuestas descartadas aparecerán aquí.";
    }
    return "La bandeja está vacía. Capturá una idea rápida o aprobá contenido en Validar.";
  }, [status]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center font-mono text-[10px] text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Cargando propuestas…
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            Incubadora vacía
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
      {proposals.map((proposal) => {
        const editor = editors[proposal.id] ?? defaultEditorState(proposal);
        const isReadOnly = status === "archived";
        const isActing = actingId === proposal.id;
        const showModerateFields = editor.densityLevel !== "simple";
        const showCompleteFields = editor.densityLevel === "completo";

        return (
          <article
            key={proposal.id}
            className="rounded-lg border border-border bg-card/50"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{proposal.title}</h2>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {formatTimestamp(proposal.createdAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{proposal.originContext}</p>
              </div>
              {proposal.description && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={editor.expanded ? "Ocultar contexto" : "Ver contexto"}
                  onClick={() =>
                    updateEditor(proposal.id, { expanded: !editor.expanded })
                  }
                >
                  {editor.expanded ? (
                    <ChevronDownIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  )}
                </Button>
              )}
            </header>

            {editor.expanded && proposal.description && (
              <div className="border-b border-border px-4 py-3">
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                  {proposal.description}
                </pre>
              </div>
            )}

            {!isReadOnly && (
              <div className="space-y-4 px-4 py-4">
                <FormField label="Nivel de carga">
                  <DensityLevelTabs
                    value={editor.densityLevel}
                    onChange={(densityLevel) =>
                      updateEditor(proposal.id, { densityLevel })
                    }
                  />
                </FormField>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField id={`${proposal.id}-tipo`} label="Categoría">
                    <select
                      id={`${proposal.id}-tipo`}
                      value={editor.tipo}
                      onChange={(event) =>
                        updateEditor(proposal.id, {
                          tipo: event.target.value as ProjectTipo,
                        })
                      }
                      className={inputClassName}
                    >
                      {PROJECT_TIPOS.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {TIPO_LABELS[tipo]}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {editor.densityLevel !== "simple" && (
                    <FormField id={`${proposal.id}-campo`} label="Campo">
                      <select
                        id={`${proposal.id}-campo`}
                        value={editor.campoSlug}
                        onChange={(event) =>
                          updateEditor(proposal.id, { campoSlug: event.target.value })
                        }
                        className={inputClassName}
                      >
                        {campos.map((campo) => (
                          <option key={campo.slug} value={campo.slug}>
                            {campo.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                </div>

                {showModerateFields && (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FormField id={`${proposal.id}-mvp`} label="¿Cuál es el MVP?">
                        <textarea
                          id={`${proposal.id}-mvp`}
                          value={editor.mvp}
                          onChange={(event) =>
                            updateEditor(proposal.id, { mvp: event.target.value })
                          }
                          rows={3}
                          className={textareaClassName}
                          placeholder="Versión mínima que demuestra valor…"
                        />
                      </FormField>

                      <FormField
                        id={`${proposal.id}-step`}
                        label="¿Cuál es el primer paso accionable hoy?"
                      >
                        <textarea
                          id={`${proposal.id}-step`}
                          value={editor.firstStep}
                          onChange={(event) =>
                            updateEditor(proposal.id, { firstStep: event.target.value })
                          }
                          rows={3}
                          className={textareaClassName}
                          placeholder="Algo concreto que podés hacer en las próximas horas…"
                        />
                      </FormField>
                    </div>

                    <FormField
                      id={`${proposal.id}-priority`}
                      label="¿Por qué esto es prioritario ahora?"
                    >
                      <textarea
                        id={`${proposal.id}-priority`}
                        value={editor.priorityReason}
                        onChange={(event) =>
                          updateEditor(proposal.id, {
                            priorityReason: event.target.value,
                          })
                        }
                        rows={2}
                        className={textareaClassName}
                        placeholder="Urgencia, ventana de oportunidad, dependencias…"
                      />
                    </FormField>

                    <FormField
                      id={`${proposal.id}-personas`}
                      label="Personas involucradas"
                    >
                      <PersonBadgeSelect
                        id={`${proposal.id}-personas`}
                        selected={editor.persons}
                        onChange={(persons) => updateEditor(proposal.id, { persons })}
                      />
                    </FormField>
                  </>
                )}

                {showCompleteFields && (
                  <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
                    <p className="font-mono text-[9px] tracking-[0.15em] text-muted-foreground uppercase">
                      Gravedad · Archivista
                    </p>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <ScaleSlider
                        id={`${proposal.id}-prioridad`}
                        label="Prioridad"
                        value={editor.gravity.prioridad}
                        onChange={(prioridad) =>
                          updateEditor(proposal.id, {
                            gravity: { ...editor.gravity, prioridad },
                          })
                        }
                      />
                      <ScaleSlider
                        id={`${proposal.id}-impacto`}
                        label="Impacto"
                        value={editor.gravity.impacto}
                        onChange={(impacto) =>
                          updateEditor(proposal.id, {
                            gravity: { ...editor.gravity, impacto },
                          })
                        }
                      />
                      <ScaleSlider
                        id={`${proposal.id}-dificultad`}
                        label="Dificultad"
                        value={editor.gravity.dificultad}
                        onChange={(dificultad) =>
                          updateEditor(proposal.id, {
                            gravity: { ...editor.gravity, dificultad },
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <FormField id={`${proposal.id}-materia`} label="Materia">
                        <select
                          id={`${proposal.id}-materia`}
                          value={editor.dimensions.materia}
                          onChange={(event) =>
                            updateEditor(proposal.id, {
                              dimensions: {
                                ...editor.dimensions,
                                materia: event.target.value,
                              },
                            })
                          }
                          className={inputClassName}
                        >
                          {MATERIA_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField id={`${proposal.id}-particula`} label="Partícula">
                        <input
                          id={`${proposal.id}-particula`}
                          type="text"
                          value={editor.dimensions.particula}
                          onChange={(event) =>
                            updateEditor(proposal.id, {
                              dimensions: {
                                ...editor.dimensions,
                                particula: event.target.value,
                              },
                            })
                          }
                          className={inputClassName}
                          placeholder="Unidad semántica…"
                        />
                      </FormField>

                      <FormField id={`${proposal.id}-onda`} label="Onda">
                        <input
                          id={`${proposal.id}-onda`}
                          type="text"
                          value={editor.dimensions.onda}
                          onChange={(event) =>
                            updateEditor(proposal.id, {
                              dimensions: {
                                ...editor.dimensions,
                                onda: event.target.value,
                              },
                            })
                          }
                          className={inputClassName}
                          placeholder="procesal, laboral, técnico…"
                        />
                      </FormField>

                      <FormField id={`${proposal.id}-espacio`} label="Espacio">
                        <select
                          id={`${proposal.id}-espacio`}
                          value={editor.dimensions.espacio}
                          onChange={(event) =>
                            updateEditor(proposal.id, {
                              dimensions: {
                                ...editor.dimensions,
                                espacio: event.target.value,
                              },
                            })
                          }
                          className={inputClassName}
                        >
                          {ORIGEN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  </div>
                )}

                {editor.densityLevel === "simple" && (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Modo rápido: solo categoría y contexto. Al activar se usarán valores
                    por defecto para MVP y primer paso.
                  </p>
                )}
              </div>
            )}

            {isReadOnly && (
              <div className="space-y-2 px-4 py-4 font-mono text-[10px] text-muted-foreground">
                {proposal.mvp && <p>MVP: {proposal.mvp}</p>}
                {proposal.firstStep && <p>Primer paso: {proposal.firstStep}</p>}
                {proposal.priorityReason && (
                  <p>Prioridad: {proposal.priorityReason}</p>
                )}
                {proposal.archivedAt && (
                  <p className="text-border">
                    Archivada: {formatTimestamp(proposal.archivedAt)}
                  </p>
                )}
              </div>
            )}

            {!isReadOnly && (
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActing}
                  onClick={() => void handleArchive(proposal)}
                >
                  {isActing ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <ArchiveIcon />
                  )}
                  Archivar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canActivate(proposal.id) || isActing}
                  onClick={() => void handleActivate(proposal)}
                >
                  {isActing ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <CheckCircle2Icon />
                  )}
                  {editor.densityLevel === "simple" ? "Activar rápido" : "Activar proyecto"}
                </Button>
              </footer>
            )}
          </article>
        );
      })}
    </div>
  );
}
