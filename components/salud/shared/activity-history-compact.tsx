"use client";

import {
  classifyExercise,
  formatActivityMetricShort,
  formatActivityTime,
} from "@/components/salud/lib/deporte-stats";
import type { Actividad } from "@/components/salud/types";
import { cn } from "@/lib/utils";

type ActivityHistoryCompactProps = {
  items: Actividad[];
  isLoading: boolean;
};

export function ActivityHistoryCompact({
  items,
  isLoading,
}: ActivityHistoryCompactProps) {
  const recent = [...items]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, 3);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/40">
      <p className="shrink-0 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Historial
      </p>
      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <p className="p-3 text-xs text-muted-foreground">Cargando...</p>
        ) : recent.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Sin actividades aún.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((item) => {
              const tag = classifyExercise(item.descripcion);
              return (
                <li key={item.id} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-1.5 py-0.5 font-mono text-[10px]",
                          tag.className,
                        )}
                      >
                        {tag.label}
                      </span>
                      <p className="mt-1 line-clamp-2 text-xs text-foreground">
                        {item.descripcion}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs tabular-nums text-foreground/80">
                        {formatActivityMetricShort(
                          item.metricType,
                          item.metricValue,
                        )}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {formatActivityTime(item.occurredAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
