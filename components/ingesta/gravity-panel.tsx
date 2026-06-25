"use client";

import { useIngesta } from "@/components/ingesta/ingesta-context";
import { SOURCE_TYPES, type SourceType } from "@/lib/document-constants";
import { BABEL_CAMPO_LABEL } from "@/lib/projects/campos";
import { cn } from "@/lib/utils";
import { MagnetIcon } from "lucide-react";

const SOURCE_LABELS: Record<SourceType, string> = {
  personal_writing: "Escrito personal",
  ai_chat: "Chat IA",
  ai_report: "Reporte IA",
  web_clip: "Recorte web",
  social_bookmark: "Marcador X",
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

export function GravityPanel() {
  const { gravity, setGravity, campos } = useIngesta();
  const isBabel = gravity.campoSlug === "babel";

  return (
    <aside className="flex h-full w-[20%] min-w-[200px] max-w-[260px] shrink-0 flex-col border-r border-border bg-card">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded bg-muted text-muted-foreground">
            <MagnetIcon className="size-3" aria-hidden />
          </span>
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
              Anclaje
            </p>
            <h2 className="text-xs font-semibold">Configuración</h2>
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
            placeholder="Opcional…"
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
              Sumidero · {BABEL_CAMPO_LABEL}
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

        <p className="mt-auto font-mono text-[9px] leading-relaxed text-muted-foreground">
          Los vectores de gravedad se calibran en Validar, después de la
          purificación.
        </p>
      </div>
    </aside>
  );
}
