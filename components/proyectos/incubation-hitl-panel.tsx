"use client";

import { CampoSelect } from "@/components/proyectos/campo-select";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/proyectos/form-controls";
import { IncubationReadiness } from "@/components/proyectos/incubation-readiness";
import {
  PersonBadgeSelect,
  type SelectedPerson,
} from "@/components/proyectos/person-badge-select";
import {
  DEFAULT_CAMPO_SLUG,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import type { IncubationExtraction } from "@/lib/projects/incubation/schema";
import type { IncubationReadiness as ReadinessType } from "@/lib/projects/incubation/readiness";
import { PROJECT_TIPOS, type ProjectTipo } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";

type IncubationHitlPanelProps = {
  extraction: IncubationExtraction;
  readiness: ReadinessType;
  campos: CampoInfo[];
  isConsolidating?: boolean;
  onChange: (patch: Partial<IncubationExtraction>) => void;
  onConsolidate: () => void;
  className?: string;
};

function SectionHeader({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {complete ? (
        <CheckCircle2Icon className="size-3.5 text-emerald-500" aria-hidden />
      ) : (
        <CircleIcon className="size-3.5 text-muted-foreground" aria-hidden />
      )}
      <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

function StringListEditor({
  items,
  onChange,
  placeholder,
  disabled,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const text = items.join("\n");

  return (
    <textarea
      value={text}
      disabled={disabled}
      rows={Math.max(2, items.length + 1)}
      placeholder={placeholder}
      className={cn(textareaClassName, "font-mono text-[11px]")}
      onChange={(event) => {
        const lines = event.target.value
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        onChange(lines);
      }}
    />
  );
}

export function IncubationHitlPanel({
  extraction,
  readiness,
  campos,
  isConsolidating = false,
  onChange,
  onConsolidate,
  className,
}: IncubationHitlPanelProps) {
  const campoSlug = (extraction.campoSlug ?? DEFAULT_CAMPO_SLUG) as CampoSlug;
  const tipo = extraction.tipo ?? "proyecto";

  return (
    <aside
      className={cn(
        "flex min-h-0 w-full shrink-0 flex-col border-l border-border bg-muted/10 lg:w-96",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Extracción en vivo
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          El panel se completa mientras conversás. Podés editar antes de consolidar.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section className="space-y-3 animate-in fade-in duration-300">
          <SectionHeader
            label="Identidad"
            complete={extraction.completitud.identidad}
          />
          <FormField id="hitl-nombre" label="Nombre">
            <input
              id="hitl-nombre"
              type="text"
              value={extraction.identidad.nombre ?? ""}
              onChange={(e) =>
                onChange({
                  identidad: { ...extraction.identidad, nombre: e.target.value },
                })
              }
              placeholder="Nombre clave del proyecto"
              className={inputClassName}
            />
          </FormField>
          <FormField id="hitl-origen" label="Origen en el tiempo">
            <input
              id="hitl-origen"
              type="text"
              value={extraction.identidad.origen_tiempo ?? ""}
              onChange={(e) =>
                onChange({
                  identidad: {
                    ...extraction.identidad,
                    origen_tiempo: e.target.value,
                  },
                })
              }
              placeholder="Fecha de inicio o hito fundacional"
              className={inputClassName}
            />
          </FormField>
          <FormField id="hitl-proyeccion" label="Proyección">
            <textarea
              id="hitl-proyeccion"
              value={extraction.identidad.proyeccion ?? ""}
              onChange={(e) =>
                onChange({
                  identidad: {
                    ...extraction.identidad,
                    proyeccion: e.target.value,
                  },
                })
              }
              placeholder="Visión a largo plazo"
              rows={2}
              className={textareaClassName}
            />
          </FormField>
        </section>

        <section className="space-y-3 animate-in fade-in duration-300">
          <SectionHeader
            label="Ecosistema"
            complete={extraction.completitud.ecosistema}
          />
          <FormField id="hitl-personas" label="Personas">
            <PersonBadgeSelect
              id="hitl-personas"
              selected={extraction.ecosistema.personas.map((name) => ({
                id: name,
                label: name,
              }))}
              onChange={(people: SelectedPerson[]) =>
                onChange({
                  ecosistema: {
                    ...extraction.ecosistema,
                    personas: people.map((p) => p.label),
                  },
                })
              }
              compact
            />
          </FormField>
          <FormField id="hitl-recursos" label="Recursos" hint="(uno por línea)">
            <StringListEditor
              items={extraction.ecosistema.recursos}
              placeholder="Repos, herramientas, links…"
              onChange={(recursos) =>
                onChange({ ecosistema: { ...extraction.ecosistema, recursos } })
              }
            />
          </FormField>
        </section>

        <section className="space-y-3 animate-in fade-in duration-300">
          <SectionHeader
            label="Ejecución"
            complete={extraction.completitud.ejecucion}
          />
          <FormField id="hitl-estado" label="Estado actual">
            <textarea
              id="hitl-estado"
              value={extraction.ejecucion.estado_actual ?? ""}
              onChange={(e) =>
                onChange({
                  ejecucion: {
                    ...extraction.ejecucion,
                    estado_actual: e.target.value,
                  },
                })
              }
              placeholder="Diagnóstico honesto del presente"
              rows={3}
              className={textareaClassName}
            />
          </FormField>
          <FormField
            id="hitl-pasos"
            label="Siguientes pasos"
            hint="(uno por línea)"
          >
            <StringListEditor
              items={extraction.ejecucion.siguientes_pasos}
              placeholder="Acciones inmediatas para la Jornada"
              onChange={(siguientes_pasos) =>
                onChange({
                  ejecucion: { ...extraction.ejecucion, siguientes_pasos },
                })
              }
            />
          </FormField>
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <CampoSelect
            value={campoSlug}
            onChange={(slug) => onChange({ campoSlug: slug })}
            campos={campos}
            label="Campo"
            hint="(contenedor del proyecto)"
          />
          <FormField id="hitl-tipo" label="Tipo">
            <select
              id="hitl-tipo"
              value={tipo}
              onChange={(e) =>
                onChange({ tipo: e.target.value as ProjectTipo })
              }
              className={inputClassName}
            >
              {PROJECT_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>
        </section>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <IncubationReadiness
          readiness={readiness}
          isConsolidating={isConsolidating}
          onConsolidate={onConsolidate}
        />
      </div>
    </aside>
  );
}
