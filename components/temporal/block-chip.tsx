"use client";

import type { TemporalBlock } from "@/lib/temporal/types";
import {
  BLOCK_KIND_LABELS,
  ECOSYSTEM_AREA_LABELS,
} from "@/lib/calendario/constants";
import { hermeticDensity } from "@/lib/calendario/gravity";
import { cn } from "@/lib/utils";

export type TemporalSkin = "noir" | "ludus";

type BlockChipProps = {
  block: TemporalBlock;
  draggable?: boolean;
  selected?: boolean;
  coagulated?: boolean;
  compact?: boolean;
  skin?: TemporalSkin;
  onClick?: () => void;
};

const KIND_STYLES = {
  noir: {
    IMMUTABLE:
      "border-zinc-600 bg-zinc-800 text-zinc-300",
    ROUTINE: "border-zinc-800 bg-zinc-900/80 text-zinc-400 opacity-75",
    SUGGESTION: "border-[#FFB000]/35 bg-[#FFB000]/10 text-zinc-100",
    default: "border-zinc-800 bg-zinc-900 text-zinc-100",
    coagulated:
      "border-[#FFB000]/70 bg-[#FFB000]/20 text-[#FFB000] opacity-100 shadow-[0_0_12px_rgba(255,176,0,0.25)]",
    task: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  },
  ludus: {
    IMMUTABLE:
      "border-primary/40 bg-primary/15 text-primary",
    ROUTINE: "border-border bg-muted/40 text-muted-foreground opacity-80",
    SUGGESTION: "border-accent/30 bg-accent/10 text-foreground",
    default: "border-primary/25 bg-primary/10 text-primary",
    coagulated:
      "border-chart-3/40 bg-chart-3/20 text-chart-3 shadow-[0_0_12px_color-mix(in_oklch,var(--chart-3)_30%,transparent)]",
    task: "border-chart-3/25 bg-chart-3/10 text-chart-3",
  },
} as const;

type SkinStyleMap = (typeof KIND_STYLES)[TemporalSkin];
type SkinClassName = SkinStyleMap[keyof SkinStyleMap];

function resolveBlockKind(block: TemporalBlock) {
  if (block.kind === "task") return null;
  return block.blockKind ?? "ROUTINE";
}

export function BlockChip({
  block,
  draggable = false,
  selected = false,
  coagulated = false,
  compact = false,
  skin = "ludus",
  onClick,
}: BlockChipProps) {
  const styles = KIND_STYLES[skin];
  const blockKind = resolveBlockKind(block);
  const isImmutable = blockKind === "IMMUTABLE";
  const isCoagulated =
    coagulated || block.executionStatus === "coagulated";
  const isSkipped = block.executionStatus === "skipped";
  const gravity = block.actionCost ?? block.weight;
  const density = hermeticDensity(gravity);

  let className: SkinClassName =
    block.kind === "task" ? styles.task : styles.default;
  if (blockKind && blockKind in styles) {
    className = styles[blockKind as keyof typeof styles];
  }
  if (isCoagulated) className = styles.coagulated;

  return (
    <div
      draggable={draggable && !isImmutable}
      data-block-id={block.id}
      data-block-kind={block.kind}
      data-gravity={gravity ?? undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "rounded-md px-2 py-1 text-xs transition-all",
        className,
        density.borderWidth,
        density.glow,
        density.inverted &&
          !isImmutable &&
          !isCoagulated &&
          "border-[#FFB000] bg-[#FFB000] text-zinc-950",
        selected && "ring-2 ring-[#FFB000]/60",
        isSkipped && "line-through opacity-40",
        isCoagulated && "opacity-100",
        !isCoagulated && blockKind === "SUGGESTION" && "opacity-90",
        onClick && "cursor-pointer",
        compact && "mb-0.5 px-1.5 py-0.5 text-[10px]",
      )}
      style={{ opacity: isSkipped ? 0.4 : isCoagulated ? 1 : density.opacity }}
    >
      <p className={cn("line-clamp-2", compact && "line-clamp-1")}>
        {block.title}
      </p>
      {!compact ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider opacity-70">
          {blockKind ? (
            <span>{BLOCK_KIND_LABELS[blockKind]}</span>
          ) : (
            <span>{block.kind}</span>
          )}
          {gravity != null ? <span>· G{gravity}</span> : null}
          {block.ecosystemArea ? (
            <span>· {ECOSYSTEM_AREA_LABELS[block.ecosystemArea]}</span>
          ) : null}
          {isCoagulated ? <span>· sólido</span> : null}
        </div>
      ) : gravity != null ? (
        <span className="font-mono text-[9px] opacity-60">G{gravity}</span>
      ) : null}
    </div>
  );
}
