"use client";

import { BlockChip, type TemporalSkin } from "@/components/temporal/block-chip";
import type { TemporalBlock } from "@/lib/temporal/types";
import { toIsoDayKey } from "@/lib/temporal/ranges";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

type WeekGridProps = {
  weekDays: Date[];
  blocks: TemporalBlock[];
  skin?: TemporalSkin;
  selectedBlockId?: string | null;
  onSelectBlock?: (block: TemporalBlock) => void;
  onRescheduleTask?: (taskId: string, day: Date) => Promise<void>;
  onRescheduleEvent?: (
    eventId: string,
    day: Date,
    originalStartIso: string,
  ) => Promise<void>;
  onSlotClick?: (day: Date) => void;
  activeSlotDay?: string | null;
};

export function WeekGrid({
  weekDays,
  blocks,
  skin = "ludus",
  selectedBlockId,
  onSelectBlock,
  onRescheduleTask,
  onRescheduleEvent,
  onSlotClick,
  activeSlotDay,
}: WeekGridProps) {
  const grouped = weekDays.map((day) => {
    const key = toIsoDayKey(day);
    const dayBlocks = blocks.filter((block) => block.start.slice(0, 10) === key);
    return { key, date: day, blocks: dayBlocks };
  });

  const panelClass =
    skin === "noir"
      ? "border-border bg-card/80 calendario-noir-panel"
      : "border-border bg-muted/40";

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
            if (kind === "task" && id && onRescheduleTask) {
              void onRescheduleTask(id, day.date);
            }
            if (kind === "event" && id && start && onRescheduleEvent) {
              void onRescheduleEvent(id, day.date, start);
            }
            if (kind === "card" && onSlotClick) {
              onSlotClick(day.date);
            }
          }}
          onClick={() => onSlotClick?.(day.date)}
          className={cn(
            "min-h-[11rem] rounded-xl border p-2 transition-colors",
            panelClass,
            activeSlotDay === day.key && "ring-1 ring-primary/50",
          )}
        >
          <header className="mb-2 border-b border-border pb-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {DAY_LABELS[index]}
            </p>
            <p className="text-sm text-foreground">{day.date.getDate()}</p>
          </header>
          <div className="space-y-2">
            {day.blocks.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Hueco libre</p>
            ) : (
              day.blocks.map((block) => (
                <div
                  key={`${block.kind}-${block.id}`}
                  onDragStart={(event) => {
                    if (block.blockKind === "IMMUTABLE") {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.setData("kind", block.kind);
                    event.dataTransfer.setData("id", block.id);
                    event.dataTransfer.setData("start", block.start);
                  }}
                >
                  <BlockChip
                    block={block}
                    skin={skin}
                    draggable={block.blockKind !== "IMMUTABLE"}
                    selected={selectedBlockId === block.id}
                    onClick={() => onSelectBlock?.(block)}
                  />
                </div>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
