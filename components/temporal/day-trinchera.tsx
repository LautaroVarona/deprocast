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
      ? "calendario-noir-panel border-border"
      : "border-border bg-card/80";

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-xl border p-3",
        panelClass,
        emphasis === "focus" && "ring-1 ring-primary/40",
        emphasis === "muted" && "opacity-80",
      )}
    >
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </h3>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {blocks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin bloques</p>
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
                    className="rounded border border-primary/30 px-2 py-0.5 font-mono text-[10px] uppercase text-primary hover:bg-primary/10"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => onSkipRoutine?.(block)}
                    className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground hover:bg-muted/50"
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
