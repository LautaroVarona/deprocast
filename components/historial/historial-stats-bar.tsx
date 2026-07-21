"use client";

import type { ActivityEntry } from "@/lib/historial/types";
import { CATEGORY_LABELS } from "@/lib/historial/types";
import { BotIcon, LayersIcon, SparklesIcon } from "lucide-react";

type HistorialStatsBarProps = {
  entries: ActivityEntry[];
  agentCount: number;
};

export function HistorialStatsBar({ entries, agentCount }: HistorialStatsBarProps) {
  const categoryCounts = new Map<string, number>();
  const models = new Set<string>();

  for (const entry of entries) {
    const label = CATEGORY_LABELS[entry.category] ?? entry.category;
    categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + 1);
    if (entry.modelUsed) models.add(entry.modelUsed);
  }

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LayersIcon className="size-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Eventos
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {entries.length}
        </p>
      </div>

      <div className="rounded-lg border border-primary/40 bg-primary/20 p-3">
        <div className="flex items-center gap-2 text-primary">
          <BotIcon className="size-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Agentes activos
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
          {agentCount}
        </p>
      </div>

      <div className="rounded-lg border border-primary/40 bg-primary/20 p-3">
        <div className="flex items-center gap-2 text-primary/80">
          <SparklesIcon className="size-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Modelos IA
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
          {models.size}
        </p>
      </div>

      {topCategories.length > 0 ? (
        <div className="col-span-full flex flex-wrap gap-1.5">
          {topCategories.map(([label, count]) => (
            <span
              key={label}
              className="rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
            >
              {count} {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
