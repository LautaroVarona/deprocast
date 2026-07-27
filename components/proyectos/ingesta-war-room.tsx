"use client";

import { HermeticScale } from "@/components/pendientes/hermetic-scale";
import { CampoSelect } from "@/components/proyectos/campo-select";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/proyectos/form-controls";
import { PersonBadgeSelect, type SelectedPerson } from "@/components/proyectos/person-badge-select";
import { Button } from "@/components/ui/button";
import type { CampoInfo } from "@/lib/projects/campos";
import type {
  MatrixSeed,
  MoscowPriority,
  MoscowTask,
} from "@/lib/projects/ideate/schema";
import { MOSCOW_PRIORITIES } from "@/lib/projects/ideate/schema";
import { PROJECT_TIPOS, type ProjectTipo } from "@/lib/projects/types";
import { MAGO3_PHASES, MAGO3_PHASE_LABELS, type Mago3Phase } from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

type IngestaWarRoomProps = {
  seed: MatrixSeed;
  onChange: (seed: MatrixSeed) => void;
  people: SelectedPerson[];
  onPeopleChange: (people: SelectedPerson[]) => void;
  campos: CampoInfo[];
  amazonANames: Record<string, string>;
  onCoagulate: () => void;
  onBack: () => void;
  isBusy?: boolean;
};

function ModuleCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3",
        className,
      )}
    >
      <h3 className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function IngestaWarRoom({
  seed,
  onChange,
  people,
  onPeopleChange,
  campos,
  amazonANames,
  onCoagulate,
  onBack,
  isBusy = false,
}: IngestaWarRoomProps) {
  const patchIdentidad = (
    partial: Partial<MatrixSeed["identidad"]>,
  ) => {
    onChange({
      ...seed,
      identidad: { ...seed.identidad, ...partial },
    });
  };

  const patchArquitectura = (
    partial: Partial<MatrixSeed["arquitectura"]>,
  ) => {
    onChange({
      ...seed,
      arquitectura: { ...seed.arquitectura, ...partial },
    });
  };

  const patchTemporal = (
    partial: Partial<MatrixSeed["motor_temporal"]>,
  ) => {
    onChange({
      ...seed,
      motor_temporal: { ...seed.motor_temporal, ...partial },
    });
  };

  const updateTask = (index: number, partial: Partial<MoscowTask>) => {
    const moscow_tasks = seed.operativa.moscow_tasks.map((task, i) =>
      i === index ? { ...task, ...partial } : task,
    );
    onChange({
      ...seed,
      operativa: { moscow_tasks },
    });
  };

  const removeTask = (index: number) => {
    onChange({
      ...seed,
      operativa: {
        moscow_tasks: seed.operativa.moscow_tasks.filter((_, i) => i !== index),
      },
    });
  };

  const addTask = () => {
    onChange({
      ...seed,
      operativa: {
        moscow_tasks: [
          ...seed.operativa.moscow_tasks,
          { title: "Nueva tarea", priority: "should" as MoscowPriority },
        ],
      },
    });
  };

  const tagsText = seed.arquitectura.tagLabels.join(", ");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="grid flex-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <ModuleCard title="1 · Identidad">
          <FormField id="wr-title" label="Nombre">
            <input
              id="wr-title"
              className={inputClassName}
              value={seed.identidad.title}
              disabled={isBusy}
              onChange={(e) => patchIdentidad({ title: e.target.value })}
            />
          </FormField>
          <FormField id="wr-pitch" label="Pitch">
            <textarea
              id="wr-pitch"
              className={textareaClassName}
              rows={3}
              value={seed.identidad.short_pitch}
              disabled={isBusy}
              onChange={(e) => patchIdentidad({ short_pitch: e.target.value })}
            />
          </FormField>
          <FormField id="wr-domain" label="Dominio">
            <input
              id="wr-domain"
              className={inputClassName}
              value={seed.identidad.domain}
              disabled={isBusy}
              onChange={(e) => patchIdentidad({ domain: e.target.value })}
            />
          </FormField>
          <FormField id="wr-tipo" label="Tipo">
            <select
              id="wr-tipo"
              className={inputClassName}
              value={seed.identidad.tipo ?? ""}
              disabled={isBusy}
              onChange={(e) =>
                patchIdentidad({
                  tipo: (e.target.value || null) as ProjectTipo | null,
                })
              }
            >
              <option value="">—</option>
              {PROJECT_TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </FormField>
          <CampoSelect
            value={seed.identidad.campoSlug}
            onChange={(campoSlug) => patchIdentidad({ campoSlug })}
            campos={campos}
            allowCreate={false}
          />
        </ModuleCard>

        <ModuleCard title="2 · Arquitectura">
          <FormField label="Personas">
            <PersonBadgeSelect
              selected={people}
              onChange={(next) => {
                onPeopleChange(next);
                patchArquitectura({
                  personNodeIds: next.map((p) => p.id),
                });
              }}
              disabled={isBusy}
              compact
            />
          </FormField>
          <FormField id="wr-tags" label="Tags / áreas">
            <input
              id="wr-tags"
              className={inputClassName}
              value={tagsText}
              disabled={isBusy}
              placeholder="separados por coma"
              onChange={(e) =>
                patchArquitectura({
                  tagLabels: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </FormField>
        </ModuleCard>

        <ModuleCard title="3 · Motor temporal">
          <FormField id="wr-mago3" label="Mago del 3">
            <select
              id="wr-mago3"
              className={inputClassName}
              value={seed.motor_temporal.mago3}
              disabled={isBusy}
              onChange={(e) =>
                patchTemporal({ mago3: e.target.value as Mago3Phase })
              }
            >
              {MAGO3_PHASES.map((phase) => (
                <option key={phase} value={phase}>
                  {MAGO3_PHASE_LABELS[phase]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="wr-mago12" label="Mago del 12">
            <input
              id="wr-mago12"
              type="number"
              min={1}
              max={12}
              className={inputClassName}
              value={seed.motor_temporal.mago12 ?? ""}
              disabled={isBusy}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) {
                  patchTemporal({ mago12: null });
                  return;
                }
                const n = Number(raw);
                if (Number.isFinite(n)) {
                  patchTemporal({
                    mago12: Math.min(12, Math.max(1, Math.round(n))),
                  });
                }
              }}
            />
          </FormField>
        </ModuleCard>

        <ModuleCard title="4 · Operativa" className="sm:col-span-2 lg:col-span-1">
          <div className="space-y-2">
            {seed.operativa.moscow_tasks.map((task, index) => (
              <div
                key={`task-${index}`}
                className="flex flex-col gap-1.5 rounded-md border border-border/80 p-2"
              >
                <div className="flex gap-1.5">
                  <input
                    className={cn(inputClassName, "flex-1")}
                    value={task.title}
                    disabled={isBusy}
                    onChange={(e) =>
                      updateTask(index, { title: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => removeTask(index)}
                    aria-label="Quitar tarea"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  <select
                    className={inputClassName}
                    value={task.priority}
                    disabled={isBusy}
                    onChange={(e) =>
                      updateTask(index, {
                        priority: e.target.value as MoscowPriority,
                      })
                    }
                  >
                    {MOSCOW_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClassName}
                    placeholder="Notas"
                    value={task.notes ?? ""}
                    disabled={isBusy}
                    onChange={(e) =>
                      updateTask(index, { notes: e.target.value })
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={addTask}
            >
              <PlusIcon />
              Tarea
            </Button>
          </div>
        </ModuleCard>

        <ModuleCard title="5 · Arsenal">
          {seed.arsenal.resourceIds.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin recursos anclados.</p>
          ) : (
            <ul className="space-y-1.5">
              {seed.arsenal.resourceIds.map((id) => (
                <li
                  key={id}
                  className="rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  {amazonANames[id] ?? id}
                </li>
              ))}
            </ul>
          )}
          {seed.arsenal.powerIds.length > 0 && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Powers: {seed.arsenal.powerIds.join(", ")}
            </p>
          )}
        </ModuleCard>

        <ModuleCard title="6 · Telemetría">
          <HermeticScale
            value={seed.telemetria.energyCost}
            disabled={isBusy}
            onChange={(energyCost) =>
              onChange({
                ...seed,
                telemetria: { ...seed.telemetria, energyCost },
              })
            }
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            Origen: {seed.telemetria.origin}
          </p>
        </ModuleCard>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
        <Button type="button" variant="outline" disabled={isBusy} onClick={onBack}>
          Volver al lienzo
        </Button>
        <Button
          type="button"
          disabled={isBusy || !seed.identidad.title.trim()}
          onClick={onCoagulate}
        >
          {isBusy ? (
            <>
              <Loader2Icon className="animate-spin" />
              Coagulando…
            </>
          ) : (
            "Coagular Proyecto"
          )}
        </Button>
      </div>
    </div>
  );
}
