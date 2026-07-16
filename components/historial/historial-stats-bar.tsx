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
      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <LayersIcon className="size-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Eventos
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
          {entries.length}
        </p>
      </div>

      <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3">
        <div className="flex items-center gap-2 text-emerald-500/80">
          <BotIcon className="size-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Agentes activos
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-100">
          {agentCount}
        </p>
      </div>

      <div className="rounded-lg border border-cyan-800/40 bg-cyan-950/20 p-3">
        <div className="flex items-center gap-2 text-cyan-500/80">
          <SparklesIcon className="size-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Modelos IA
          </span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-cyan-100">
          {models.size}
        </p>
      </div>

      {topCategories.length > 0 ? (
        <div className="col-span-full flex flex-wrap gap-1.5">
          {topCategories.map(([label, count]) => (
            <span
              key={label}
              className="rounded-full border border-zinc-700/80 bg-zinc-950 px-2.5 py-1 font-mono text-[10px] text-zinc-400"
            >
              {count} {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
