"use client";

import { MiniCalendar } from "@/components/diario/mini-calendar";
import type { TemporalBlock } from "@/lib/temporal/types";

type CampamentoMonthViewProps = {
  year: number;
  month: number;
  blocks: TemporalBlock[];
  onMonthChange: (year: number, month: number) => void;
};

export function CampamentoMonthView({
  year,
  month,
  blocks,
  onMonthChange,
}: CampamentoMonthViewProps) {
  const daysWithEntries = Array.from(
    new Set(
      blocks
        .filter((block) => {
          const date = new Date(block.start);
          return date.getFullYear() === year && date.getMonth() + 1 === month;
        })
        .map((block) => new Date(block.start).getDate()),
    ),
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <MiniCalendar
        year={year}
        month={month}
        selectedDay={null}
        daysWithEntries={daysWithEntries}
        onMonthChange={onMonthChange}
        onDaySelect={() => {}}
      />
    </div>
  );
}
