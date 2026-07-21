"use client";

import { BlockChip, type TemporalSkin } from "@/components/temporal/block-chip";
import type { TemporalBlock } from "@/lib/temporal/types";
import { cn } from "@/lib/utils";

type DayTrincheraProps = {
  yesterday: TemporalBlock[];
  today: TemporalBlock[];
  tomorrow: TemporalBlock[];
  skin?: TemporalSkin;
  selectedBlockId?: string | null;
  onSelectBlock?: (block: TemporalBlock) => void;
  onConfirmRoutine?: (block: TemporalBlock) => void;
  onSkipRoutine?: (block: TemporalBlock) => void;
};

function DayColumn({
  label,
  blocks,
  skin,
  selectedBlockId,
  onSelectBlock,
  onConfirmRoutine,
  onSkipRoutine,
  emphasis,
}: {
  label: string;
  blocks: TemporalBlock[];
  skin: TemporalSkin;
  selectedBlockId?: string | null;
  onSelectBlock?: (block: TemporalBlock) => void;
  onConfirmRoutine?: (block: TemporalBlock) => void;
  onSkipRoutine?: (block: TemporalBlock) => void;
  emphasis?: "focus" | "muted";
}) {
  const panelClass =
    skin === "noir"
      ? "calendario-noir-panel border-white/8"
      : "border-white/10 bg-black/25";

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-xl border p-3",
        panelClass,
        emphasis === "focus" && "ring-1 ring-cyan-400/40",
        emphasis === "muted" && "opacity-80",
      )}
    >
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </h3>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {blocks.length === 0 ? (
          <p className="text-xs text-zinc-500">Sin bloques</p>
        ) : (
          blocks.map((block) => (
            <div key={`${block.kind}-${block.id}`} className="space-y-1">
              <BlockChip
                block={block}
                skin={skin}
                selected={selectedBlockId === block.id}
                onClick={() => onSelectBlock?.(block)}
              />
              {block.blockKind === "ROUTINE" && emphasis === "focus" ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onConfirmRoutine?.(block)}
                    className="rounded border border-emerald-500/30 px-2 py-0.5 font-mono text-[9px] uppercase text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => onSkipRoutine?.(block)}
                    className="rounded border border-zinc-600/40 px-2 py-0.5 font-mono text-[9px] uppercase text-zinc-400 hover:bg-zinc-800/50"
                  >
                    Saltear
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function DayTrinchera({
  yesterday,
  today,
  tomorrow,
  skin = "noir",
  selectedBlockId,
  onSelectBlock,
  onConfirmRoutine,
  onSkipRoutine,
}: DayTrincheraProps) {
  const immutablesToday = today.filter((b) => b.blockKind === "IMMUTABLE");
  const restToday = today.filter((b) => b.blockKind !== "IMMUTABLE");
  const executedYesterday = yesterday.filter(
    (b) => b.executionStatus === "executed" || b.executionStatus === "coagulated",
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-3">
      <DayColumn
        label="Ayer · Ejecutado"
        blocks={executedYesterday.length > 0 ? executedYesterday : yesterday}
        skin={skin}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
        emphasis="muted"
      />
      <DayColumn
        label="Hoy · Innegociable"
        blocks={[...immutablesToday, ...restToday]}
        skin={skin}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
        onConfirmRoutine={onConfirmRoutine}
        onSkipRoutine={onSkipRoutine}
        emphasis="focus"
      />
      <DayColumn
        label="Mañana · Horizonte"
        blocks={tomorrow}
        skin={skin}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
        emphasis="muted"
      />
    </div>
  );
}
