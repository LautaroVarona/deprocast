"use client";

import { MiniCalendar } from "@/components/diario/mini-calendar";
import type { TemporalBlock } from "@/lib/temporal/types";
import { cn } from "@/lib/utils";
import type { TemporalSkin } from "@/components/temporal/block-chip";

type MonthBoardProps = {
  year: number;
  month: number;
  blocks: TemporalBlock[];
  skin?: TemporalSkin;
  onMonthChange: (year: number, month: number) => void;
  onDaySelect?: (day: number) => void;
  selectedDay?: number | null;
};

export function MonthBoard({
  year,
  month,
  blocks,
  skin = "ludus",
  onMonthChange,
  onDaySelect,
  selectedDay = null,
}: MonthBoardProps) {
  const monthBlocks = blocks.filter((block) => {
    const date = new Date(block.start);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  const daysWithEntries = Array.from(
    new Set(monthBlocks.map((block) => new Date(block.start).getDate())),
  );

  const bosses = monthBlocks
    .filter((b) => (b.actionCost ?? 0) >= 8)
    .slice(0, 6);

  const fogDays = new Date(year, month, 0).getDate() - daysWithEntries.length;

  const panelClass =
    skin === "noir"
      ? "calendario-noir-panel border-white/8"
      : "border-white/10 bg-black/25";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className={cn("rounded-xl border p-3", panelClass)}>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
          {skin === "noir" ? "El Castillo · Vision Board" : "Control mensual · Campamento"}
        </p>
        <MiniCalendar
          year={year}
          month={month}
          selectedDay={selectedDay}
          daysWithEntries={daysWithEntries}
          onMonthChange={onMonthChange}
          onDaySelect={onDaySelect ?? (() => {})}
        />
        <p className="mt-2 font-mono text-[10px] text-zinc-500">
          Niebla de guerra: {fogDays} días sin densidad este mes
        </p>
      </div>

      {bosses.length > 0 && skin === "noir" ? (
        <div className={cn("rounded-xl border p-3", panelClass)}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/80">
            Bosses del mes
          </p>
          <ul className="space-y-2">
            {bosses.map((boss) => (
              <li
                key={boss.id}
                className="rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100"
              >
                <span className="font-mono text-[10px] text-amber-400/70">
                  G{boss.actionCost}
                </span>
                <p className="mt-0.5">{boss.title}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
