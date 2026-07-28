"use client";

import { BlockChip, type TemporalSkin } from "@/components/temporal/block-chip";
import {
  CAMPAMENTO_HOUR_END,
  CAMPAMENTO_HOUR_START,
} from "@/lib/calendario/gravity";
import {
  SLOT_DROP_TYPE,
  timeSlotId,
  type TimeSlotDropData,
} from "@/lib/calendario/dnd";
import type { TemporalBlock } from "@/lib/temporal/types";
import { toIsoDayKey } from "@/lib/temporal/ranges";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

const DAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const HOURS = Array.from(
  { length: CAMPAMENTO_HOUR_END - CAMPAMENTO_HOUR_START + 1 },
  (_, i) => CAMPAMENTO_HOUR_START + i,
);

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
  onSlotClick?: (day: Date, hour?: number) => void;
  activeSlotDay?: string | null;
  onAssignAmazona?: (resourceId: string, day: Date) => Promise<void> | void;
  /** Vista compacta (solo columnas por día) vs grid horario táctico. */
  hourGrid?: boolean;
};

function blockHour(block: TemporalBlock): number {
  const d = new Date(block.start);
  const h = d.getHours();
  if (Number.isNaN(h)) return CAMPAMENTO_HOUR_START;
  return Math.min(CAMPAMENTO_HOUR_END, Math.max(CAMPAMENTO_HOUR_START, h));
}

function HourCell({
  dayKey,
  hour,
  blocks,
  skin,
  selectedBlockId,
  onSelectBlock,
  onSlotClick,
  dayDate,
}: {
  dayKey: string;
  hour: number;
  blocks: TemporalBlock[];
  skin: TemporalSkin;
  selectedBlockId?: string | null;
  onSelectBlock?: (block: TemporalBlock) => void;
  onSlotClick?: (day: Date, hour?: number) => void;
  dayDate: Date;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: timeSlotId(dayKey, hour),
    data: {
      type: SLOT_DROP_TYPE,
      dayKey,
      hour,
    } satisfies TimeSlotDropData,
  });

  const hasImmutable = blocks.some((b) => b.blockKind === "IMMUTABLE");

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onSlotClick?.(dayDate, hour);
      }}
      className={cn(
        "min-h-[2.75rem] border-b border-r border-zinc-800/80 p-0.5 transition-colors",
        isOver && !hasImmutable && "bg-[#FFB000]/15 ring-1 ring-inset ring-[#FFB000]/60",
        isOver && hasImmutable && "bg-red-500/20 ring-1 ring-inset ring-red-500/50",
        hasImmutable && "bg-zinc-900/60",
      )}
    >
      {blocks.map((block) => (
        <BlockChip
          key={`${block.kind}-${block.id}`}
          block={block}
          skin={skin}
          compact
          coagulated={block.executionStatus === "coagulated"}
          selected={selectedBlockId === block.id}
          onClick={() => onSelectBlock?.(block)}
        />
      ))}
    </div>
  );
}

function DayColumnDroppable({
  dayKey,
  dayDate,
  label,
  dayNum,
  blocks,
  skin,
  selectedBlockId,
  onSelectBlock,
  onSlotClick,
  active,
}: {
  dayKey: string;
  dayDate: Date;
  label: string;
  dayNum: number;
  blocks: TemporalBlock[];
  skin: TemporalSkin;
  selectedBlockId?: string | null;
  onSelectBlock?: (block: TemporalBlock) => void;
  onSlotClick?: (day: Date, hour?: number) => void;
  active?: boolean;
}) {
  const noonHour = 10;
  const { setNodeRef, isOver } = useDroppable({
    id: timeSlotId(dayKey, noonHour),
    data: {
      type: SLOT_DROP_TYPE,
      dayKey,
      hour: noonHour,
    } satisfies TimeSlotDropData,
  });

  return (
    <section
      ref={setNodeRef}
      onClick={() => onSlotClick?.(dayDate, noonHour)}
      className={cn(
        "min-h-[11rem] rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 transition-colors",
        (active || isOver) && "ring-1 ring-[#FFB000]/50",
        isOver && "bg-[#FFB000]/10",
      )}
    >
      <header className="mb-2 border-b border-zinc-800 pb-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </p>
        <p className="text-sm text-zinc-100">{dayNum}</p>
      </header>
      <div className="space-y-2">
        {blocks.length === 0 ? (
          <p className="text-[11px] text-zinc-600">Hueco libre</p>
        ) : (
          blocks.map((block) => (
            <BlockChip
              key={`${block.kind}-${block.id}`}
              block={block}
              skin={skin}
              coagulated={block.executionStatus === "coagulated"}
              selected={selectedBlockId === block.id}
              onClick={() => onSelectBlock?.(block)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function WeekGrid({
  weekDays,
  blocks,
  skin = "ludus",
  selectedBlockId,
  onSelectBlock,
  onSlotClick,
  activeSlotDay,
  hourGrid = true,
}: WeekGridProps) {
  const grouped = weekDays.map((day) => {
    const key = toIsoDayKey(day);
    const dayBlocks = blocks.filter((block) => block.start.slice(0, 10) === key);
    return { key, date: day, blocks: dayBlocks };
  });

  if (!hourGrid) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-7">
        {grouped.map((day, index) => (
          <DayColumnDroppable
            key={day.key}
            dayKey={day.key}
            dayDate={day.date}
            label={DAY_LABELS[index] ?? ""}
            dayNum={day.date.getDate()}
            blocks={day.blocks}
            skin={skin}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onSlotClick={onSlotClick}
            active={activeSlotDay === day.key}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/90">
      <div
        className="grid min-w-[52rem]"
        style={{
          gridTemplateColumns: `3rem repeat(${grouped.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 p-2" />
        {grouped.map((day, index) => (
          <div
            key={`head-${day.key}`}
            className={cn(
              "sticky top-0 z-10 border-b border-l border-zinc-800 bg-zinc-950 px-2 py-2",
              activeSlotDay === day.key && "bg-[#FFB000]/5",
            )}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {DAY_LABELS[index]}
            </p>
            <p className="text-sm text-zinc-100">{day.date.getDate()}</p>
          </div>
        ))}

        {HOURS.map((hour) => (
          <div key={`row-${hour}`} className="contents">
            <div className="border-b border-zinc-800 px-1 py-1 text-right font-mono text-[10px] text-zinc-600">
              {String(hour).padStart(2, "0")}
            </div>
            {grouped.map((day) => {
              const slotBlocks = day.blocks.filter(
                (b) => blockHour(b) === hour,
              );
              return (
                <HourCell
                  key={`${day.key}-${hour}`}
                  dayKey={day.key}
                  hour={hour}
                  dayDate={day.date}
                  blocks={slotBlocks}
                  skin={skin}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={onSelectBlock}
                  onSlotClick={onSlotClick}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
