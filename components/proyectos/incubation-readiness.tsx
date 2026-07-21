"use client";

import { cn } from "@/lib/utils";
import type { IncubationReadiness } from "@/lib/projects/incubation/readiness";
import { Loader2Icon, SparklesIcon } from "lucide-react";

type IncubationReadinessProps = {
  readiness: IncubationReadiness;
  isConsolidating?: boolean;
  onConsolidate: () => void;
};

export function IncubationReadinessPanel({
  readiness,
  isConsolidating = false,
  onConsolidate,
}: IncubationReadinessProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
          Completitud
        </p>
        <ul className="space-y-1 text-[11px]">
          {(
            [
              ["Identidad", readiness.completitud.identidad],
              ["Ecosistema", readiness.completitud.ecosistema],
              ["Ejecución", readiness.completitud.ejecucion],
            ] as const
          ).map(([label, done]) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2",
                done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      {readiness.missing.length > 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Falta: {readiness.missing.join(", ")}
        </p>
      )}

      {readiness.recommendations.length > 0 && readiness.isReady && (
        <p className="text-[10px] text-muted-foreground">
          Sugerido: {readiness.recommendations.join("; ")}
        </p>
      )}

      <button
        type="button"
        disabled={!readiness.isReady || isConsolidating}
        onClick={onConsolidate}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
          readiness.isReady
            ? "border border-amber-400/40 bg-amber-500/90 text-black hover:bg-amber-400"
            : "cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-60",
        )}
      >
        {isConsolidating ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SparklesIcon className="size-4" />
        )}
        {isConsolidating ? "Consolidando…" : "Consolidar Proyecto"}
      </button>
    </div>
  );
}

// Re-export with plan name
export { IncubationReadinessPanel as IncubationReadiness };
