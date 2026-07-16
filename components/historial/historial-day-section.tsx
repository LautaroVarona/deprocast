"use client";

import type { ActivityEntry } from "@/lib/historial/types";
import { ActivityEntryRow } from "@/components/historial/activity-entry-row";
import { buildDayCategorySummary } from "@/components/historial/historial-utils";
import { cn } from "@/lib/utils";

export type ActivityDayGroup = {
  dayKey: string;
  dayLabel: string;
  entries: ActivityEntry[];
};

type HistorialDaySectionProps = {
  group: ActivityDayGroup;
  compact?: boolean;
  stickyHeader?: boolean;
};

export function HistorialDaySection({
  group,
  compact = false,
  stickyHeader = false,
}: HistorialDaySectionProps) {
  return (
    <section className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border-l-4 border-cyan-500/50 bg-zinc-900/30 py-2 pl-3 pr-2",
          stickyHeader && "sticky top-0 z-10 backdrop-blur-sm",
        )}
      >
        <h2 className="text-sm font-semibold capitalize text-zinc-200">
          {group.dayLabel}
        </h2>
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          {group.entries.length}
        </span>
      </div>
      <p className="pl-1 font-mono text-[10px] text-zinc-600">
        {buildDayCategorySummary(group.entries)}
      </p>
      <div className="space-y-2">
        {group.entries.map((entry) => (
          <ActivityEntryRow key={entry.id} entry={entry} compact={compact} />
        ))}
      </div>
    </section>
  );
}
