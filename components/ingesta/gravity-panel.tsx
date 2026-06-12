"use client";

import { useIngesta } from "@/components/ingesta/ingesta-context";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
  SOURCE_TYPES,
  type SourceType,
} from "@/lib/document-constants";
import { BABEL_CAMPO_LABEL } from "@/lib/projects/campos";
import { cn } from "@/lib/utils";
import { MagnetIcon } from "lucide-react";

const SOURCE_LABELS: Record<SourceType, string> = {
  personal_writing: "Escrito personal",
  ai_chat: "Chat IA",
  ai_report: "Reporte IA",
  web_clip: "Recorte web",
  book_excerpt: "Extracto libro",
};

const ONDA_SUGGESTIONS = [
  "sin-clasificar",
  "procesal",
  "laboral",
  "tecnico",
  "salud",
  "personal",
  "legal",
  "finanzas",
];

function GravitySlider({
  id,
  label,
  value,
  onChange,
  critical,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  critical?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
        >
          {label}
        </label>
        <span
          className={cn(
            "font-mono text-[11px] font-semibold tabular-nums",
            critical ? "text-destructive" : "text-foreground",
          )}
        >
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={MIN_BASE_WEIGHT}
        max={MAX_BASE_WEIGHT}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "h-1 w-full appearance-none rounded-full bg-muted accent-primary",
          critical && "accent-destructive",
        )}
      />
    </div>
  );
}

export function GravityPanel() {
  const { gravity, setGravity, campos, baseWeight } = useIngesta();
  const isCritical = baseWeight >= 10;
  const isBabel = gravity.campoSlug === "babel";

  return (
    <aside className="flex h-full w-[35%] shrink-0 flex-col border-r border-border bg-card">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded bg-muted text-muted-foreground">
            <MagnetIcon className="size-3" aria-hidden />
          </span>
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
              Anclaje
            </p>
            <h2 className="text-xs font-semibold">Configuración de Gravedad</h2>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          <label
            htmlFor="ingesta-title"
            className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
          >
            Título
          </label>
          <input
            id="ingesta-title"
            type="text"
            value={gravity.title}
            onChange={(event) => setGravity({ title: event.target.value })}
            placeholder="Sin título..."
            className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[11px] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Campo
          </p>
          <select
            value={gravity.campoSlug}
            onChange={(event) => setGravity({ campoSlug: event.target.value })}
            className="h-7 w-full rounded border border-input bg-background px-2 text-[11px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            {campos.map((campo) => (
              <option key={campo.slug} value={campo.slug}>
                {campo.slug === "babel" ? BABEL_CAMPO_LABEL : campo.label}
              </option>
            ))}
          </select>
          {isBabel && (
            <p className="font-mono text-[9px] text-amber-600/90 dark:text-amber-400/90">
              Sumidero universal · {BABEL_CAMPO_LABEL}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="ingesta-onda"
            className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
          >
            Onda
          </label>
          <input
            id="ingesta-onda"
            type="text"
            list="onda-suggestions"
            value={gravity.onda}
            onChange={(event) => setGravity({ onda: event.target.value })}
            placeholder="sin-clasificar"
            className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[11px] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <datalist id="onda-suggestions">
            {ONDA_SUGGESTIONS.map((onda) => (
              <option key={onda} value={onda} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Tipo de fuente
          </p>
          <div className="flex flex-wrap gap-1">
            {SOURCE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setGravity({ sourceType: type })}
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[9px] transition-colors",
                  gravity.sourceType === type
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/50 text-muted-foreground hover:border-ring hover:text-foreground",
                )}
              >
                {SOURCE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "space-y-2 rounded border p-2.5",
            isCritical
              ? "border-destructive/40 bg-destructive/10 shadow-[0_0_12px] shadow-destructive/10"
              : "border-border bg-muted/40",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Vectores de gravedad
            </p>
            <span
              className={cn(
                "font-mono text-[9px] tabular-nums",
                isCritical ? "text-destructive" : "text-muted-foreground",
              )}
            >
              peso {baseWeight}
            </span>
          </div>
          <GravitySlider
            id="ingesta-prioridad"
            label="Prioridad"
            value={gravity.prioridad}
            onChange={(prioridad) => setGravity({ prioridad })}
            critical={gravity.prioridad >= 10}
          />
          <GravitySlider
            id="ingesta-impacto"
            label="Impacto"
            value={gravity.impacto}
            onChange={(impacto) => setGravity({ impacto })}
            critical={gravity.impacto >= 10}
          />
          <GravitySlider
            id="ingesta-dificultad"
            label="Dificultad"
            value={gravity.dificultad}
            onChange={(dificultad) => setGravity({ dificultad })}
            critical={gravity.dificultad >= 10}
          />
        </div>
      </div>
    </aside>
  );
}
