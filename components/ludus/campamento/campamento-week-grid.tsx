"use client";

import { TemporalBlockChip } from "@/components/ludus/campamento/temporal-block-chip";
import type { TemporalBlock } from "@/lib/temporal/types";
import { toIsoDayKey } from "@/lib/temporal/ranges";

const DAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

type CampamentoWeekGridProps = {
  weekDays: Date[];
  blocks: TemporalBlock[];
  onRescheduleTask: (taskId: string, day: Date) => Promise<void>;
  onRescheduleEvent: (
    eventId: string,
    day: Date,
    originalStartIso: string,
  ) => Promise<void>;
};

export function CampamentoWeekGrid({
  weekDays,
  blocks,
  onRescheduleTask,
  onRescheduleEvent,
}: CampamentoWeekGridProps) {
  const grouped = weekDays.map((day) => {
    const key = toIsoDayKey(day);
    const dayBlocks = blocks.filter((block) => block.start.slice(0, 10) === key);
    return { key, date: day, blocks: dayBlocks };
  });

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-7">
      {grouped.map((day, index) => (
        <section
          key={day.key}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const kind = event.dataTransfer.getData("kind");
            const id = event.dataTransfer.getData("id");
            const start = event.dataTransfer.getData("start");
            if (kind === "task" && id) {
              void onRescheduleTask(id, day.date);
            }
            if (kind === "event" && id && start) {
              void onRescheduleEvent(id, day.date, start);
            }
          }}
          className="min-h-[11rem] rounded-xl border border-white/10 bg-black/25 p-2"
        >
          <header className="mb-2 border-b border-white/10 pb-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
              {DAY_LABELS[index]}
            </p>
            <p className="text-sm text-white">{day.date.getDate()}</p>
          </header>
          <div className="space-y-2">
            {day.blocks.length === 0 ? (
              <p className="text-[11px] text-white/40">Sin bloques</p>
            ) : (
              day.blocks.map((block) => (
                <div
                  key={`${block.kind}-${block.id}`}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("kind", block.kind);
                    event.dataTransfer.setData("id", block.id);
                    event.dataTransfer.setData("start", block.start);
                  }}
                >
                  <TemporalBlockChip block={block} draggable />
                </div>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
