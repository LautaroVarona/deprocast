"use client";

import { Button } from "@/components/ui/button";
import { CampoMultiSelect } from "@/components/proyectos/campo-multi-select";
import {
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
  isCampoSlug,
  normalizeCampoSlugs,
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
import type { ReactNode } from "react";

export type DensityLevel = "simple" | "moderado" | "completo";

export type ProposalEditorState = {
  mvp: string;
  firstStep: string;
  priorityReason: string;
  tipo: ProjectTipo;
  campoSlugs: CampoSlug[];
  persons: SelectedPerson[];
  gravity: { prioridad: number; impacto: number; dificultad: number };
  dimensions: { materia: string; particula: string; onda: string; espacio: string };
  contextExpanded: boolean;
  detailsExpanded: boolean;
};

const TIPO_LABELS: Record<ProjectTipo, string> = {
  proyecto: "Proyecto",
  reto: "Reto",
  area: "Área",
};

const compactInput = cn(inputClassName, "h-6 rounded px-2 text-[11px]");
const compactTextarea = cn(textareaClassName, "min-h-[2.25rem] resize-none px-2 py-1 text-[11px]");

function CompactField({
  id,
  label,
  children,
  className,
}: {
  id?: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <label
        htmlFor={id}
        className="block font-mono text-[8px] tracking-[0.12em] text-muted-foreground uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

type ProposalCardProps = {
  proposal: ProjectProposal;
  editor: ProposalEditorState;
  densityLevel: DensityLevel;
  campos: CampoInfo[];
  isReadOnly: boolean;
  isActing: boolean;
  canActivate: boolean;
  onUpdate: (patch: Partial<ProposalEditorState>) => void;
  onCamposChange: (campos: CampoInfo[]) => void;
  onActivate: () => void;
  onArchive: () => void;
  formatTimestamp: (iso: string) => string;
};

export function ProposalCard({
  proposal,
  editor,
  densityLevel,
  campos,
  isReadOnly,
  isActing,
  canActivate,
  onUpdate,
  onCamposChange,
  onActivate,
  onArchive,
  formatTimestamp,
}: ProposalCardProps) {
  const showModerateFields = densityLevel !== "simple";
  const showCompleteFields = densityLevel === "completo";
  const isSimple = densityLevel === "simple";
  const hasExtraFields = showModerateFields || showCompleteFields;

  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-border bg-card/50">
      {/* Header compacto: título + acciones */}
      <header className="flex items-start gap-1 border-b border-border/80 bg-muted/20 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <h2
            className="line-clamp-2 text-[11px] font-semibold leading-tight"
            title={proposal.title}
          >
            {proposal.title}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 font-mono text-[8px] text-muted-foreground">
            <span>{formatTimestamp(proposal.createdAt)}</span>
            {proposal.description ? (
              <button
                type="button"
                className="inline-flex items-center gap-0.5 hover:text-foreground"
                onClick={() =>
                  onUpdate({ contextExpanded: !editor.contextExpanded })
                }
              >
                {editor.contextExpanded ? (
                  <ChevronDownIcon className="size-2.5" />
                ) : (
                  <ChevronRightIcon className="size-2.5" />
                )}
                ctx
              </button>
            ) : null}
            {hasExtraFields && !isReadOnly ? (
              <button
                type="button"
                className="inline-flex items-center gap-0.5 hover:text-foreground"
                onClick={() =>
                  onUpdate({ detailsExpanded: !editor.detailsExpanded })
                }
              >
                {editor.detailsExpanded ? (
                  <ChevronDownIcon className="size-2.5" />
                ) : (
                  <ChevronRightIcon className="size-2.5" />
                )}
                detalle
              </button>
            ) : null}
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isActing}
              onClick={onArchive}
              className="size-6"
              title="Archivar"
            >
              {isActing ? (
                <Loader2Icon className="size-3 animate-spin" />
              ) : (
                <ArchiveIcon className="size-3" />
              )}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              disabled={!canActivate || isActing}
              onClick={onActivate}
              className="size-6"
              title={isSimple ? "Activar rápido" : "Activar"}
            >
              {isActing ? (
                <Loader2Icon className="size-3 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-3" />
              )}
            </Button>
          </div>
        )}
      </header>

      {editor.contextExpanded && proposal.description && (
        <div className="border-b border-border/60 px-2 py-1">
          <pre className="max-h-16 overflow-auto whitespace-pre-wrap font-mono text-[8px] leading-snug text-muted-foreground">
            {proposal.description}
          </pre>
        </div>
      )}

      {!isReadOnly && (
        <div className="space-y-1.5 px-2 py-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <CompactField id={`${proposal.id}-tipo`} label="Tipo">
              <select
                id={`${proposal.id}-tipo`}
                value={editor.tipo}
                onChange={(event) =>
                  onUpdate({ tipo: event.target.value as ProjectTipo })
                }
                className={compactInput}
              >
                {PROJECT_TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {TIPO_LABELS[tipo]}
                  </option>
                ))}
              </select>
            </CompactField>

            <CompactField id={`${proposal.id}-personas`} label="Personas">
              <PersonBadgeSelect
                id={`${proposal.id}-personas`}
                selected={editor.persons}
                onChange={(persons) => onUpdate({ persons })}
                compact
              />
            </CompactField>
          </div>

          <CompactField id={`${proposal.id}-campos`} label="Campos">
            <CampoMultiSelect
              id={`${proposal.id}-campos`}
              selected={editor.campoSlugs}
              onChange={(campoSlugs) => onUpdate({ campoSlugs })}
              campos={campos}
              onCamposChange={onCamposChange}
              compact
            />
          </CompactField>

          {showModerateFields && editor.detailsExpanded && (
            <div className="grid gap-1.5 border-t border-border/50 pt-1.5">
              <CompactField id={`${proposal.id}-mvp`} label="MVP">
                <textarea
                  id={`${proposal.id}-mvp`}
                  value={editor.mvp}
                  onChange={(event) => onUpdate({ mvp: event.target.value })}
                  rows={1}
                  className={compactTextarea}
                  placeholder="Versión mínima…"
                />
              </CompactField>
              <div className="grid grid-cols-2 gap-1.5">
                <CompactField id={`${proposal.id}-step`} label="Paso">
                  <textarea
                    id={`${proposal.id}-step`}
                    value={editor.firstStep}
                    onChange={(event) =>
                      onUpdate({ firstStep: event.target.value })
                    }
                    rows={1}
                    className={compactTextarea}
                    placeholder="Hoy…"
                  />
                </CompactField>
                <CompactField id={`${proposal.id}-priority`} label="Prioridad">
                  <textarea
                    id={`${proposal.id}-priority`}
                    value={editor.priorityReason}
                    onChange={(event) =>
                      onUpdate({ priorityReason: event.target.value })
                    }
                    rows={1}
                    className={compactTextarea}
                    placeholder="¿Por qué?"
                  />
                </CompactField>
              </div>
            </div>
          )}

          {showCompleteFields && editor.detailsExpanded && (
            <div className="space-y-1 rounded border border-border/60 bg-muted/10 p-1.5">
              <div className="grid grid-cols-3 gap-1">
                <ScaleSlider
                  id={`${proposal.id}-prioridad`}
                  label="Prio"
                  value={editor.gravity.prioridad}
                  onChange={(prioridad) =>
                    onUpdate({ gravity: { ...editor.gravity, prioridad } })
                  }
                />
                <ScaleSlider
                  id={`${proposal.id}-impacto`}
                  label="Imp"
                  value={editor.gravity.impacto}
                  onChange={(impacto) =>
                    onUpdate({ gravity: { ...editor.gravity, impacto } })
                  }
                />
                <ScaleSlider
                  id={`${proposal.id}-dificultad`}
                  label="Dif"
                  value={editor.gravity.dificultad}
                  onChange={(dificultad) =>
                    onUpdate({ gravity: { ...editor.gravity, dificultad } })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <CompactField id={`${proposal.id}-materia`} label="Materia">
                  <select
                    id={`${proposal.id}-materia`}
                    value={editor.dimensions.materia}
                    onChange={(event) =>
                      onUpdate({
                        dimensions: {
                          ...editor.dimensions,
                          materia: event.target.value,
                        },
                      })
                    }
                    className={compactInput}
                  >
                    {MATERIA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </CompactField>
                <CompactField id={`${proposal.id}-espacio`} label="Espacio">
                  <select
                    id={`${proposal.id}-espacio`}
                    value={editor.dimensions.espacio}
                    onChange={(event) =>
                      onUpdate({
                        dimensions: {
                          ...editor.dimensions,
                          espacio: event.target.value,
                        },
                      })
                    }
                    className={compactInput}
                  >
                    {ORIGEN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </CompactField>
              </div>
            </div>
          )}

          {hasExtraFields && !editor.detailsExpanded && (
            <p className="font-mono text-[8px] text-muted-foreground">
              + detalle para MVP, gravedad…
            </p>
          )}
        </div>
      )}

      {isReadOnly && (
        <div className="space-y-0.5 px-2 py-1.5 font-mono text-[8px] text-muted-foreground">
          {proposal.mvp && <p className="line-clamp-1">MVP: {proposal.mvp}</p>}
          {proposal.archivedAt && (
            <p>Archivada: {formatTimestamp(proposal.archivedAt)}</p>
          )}
        </div>
      )}
    </article>
  );
}

export function extractCampoSlugsFromProposal(
  proposal: ProjectProposal,
): CampoSlug[] {
  const payload = proposal.sourcePayload;
  const fromPayload = payload?.suggestedCampoSlugs;
  if (Array.isArray(fromPayload)) {
    const slugs = fromPayload.filter((s): s is CampoSlug => isCampoSlug(s));
    if (slugs.length > 0) return normalizeCampoSlugs(slugs);
  }

  if (
    proposal.suggestedCampoSlug &&
    isCampoSlug(proposal.suggestedCampoSlug)
  ) {
    return normalizeCampoSlugs([proposal.suggestedCampoSlug]);
  }

  return [DEFAULT_CAMPO_SLUG];
}
