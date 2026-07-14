"use client";

import {
  classifyExercise,
  formatActivityDay,
  formatActivityMetricShort,
  formatActivityTime,
} from "@/components/salud/lib/deporte-stats";
import type { Actividad } from "@/components/salud/types";
import { cn } from "@/lib/utils";

type ActivityHistoryFeedProps = {
  items: Actividad[];
  isLoading: boolean;
};

export function ActivityHistoryFeed({
  items,
  isLoading,
}: ActivityHistoryFeedProps) {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  if (isLoading) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-500">Cargando historial...</p>
    );
  }

  if (sorted.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-500">
        Sin actividades registradas todavía.
      </p>
    );
  }

  return (
    <ul className="space-y-2 px-4 pb-6">
      {sorted.map((item) => {
        const tag = classifyExercise(item.descripcion);
        return (
          <li
            key={item.id}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border border-zinc-800/80",
              "bg-zinc-900/30 px-4 py-3 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                    tag.className,
                  )}
                >
                  {tag.label}
                </span>
                <span className="font-mono text-[10px] text-zinc-600">
                  {formatActivityDay(item.occurredAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-zinc-100">
                {item.descripcion}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm tabular-nums text-zinc-300">
                {formatActivityMetricShort(item.metricType, item.metricValue)}
              </p>
              <p className="font-mono text-[10px] text-zinc-500">
                {formatActivityTime(item.occurredAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
