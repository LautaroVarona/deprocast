"use client";

import type { TemporalBlock } from "@/lib/temporal/types";
import {
  BLOCK_KIND_LABELS,
  ECOSYSTEM_AREA_LABELS,
} from "@/lib/calendario/constants";
import { cn } from "@/lib/utils";

export type TemporalSkin = "noir" | "ludus";

type BlockChipProps = {
  block: TemporalBlock;
  draggable?: boolean;
  selected?: boolean;
  coagulated?: boolean;
  skin?: TemporalSkin;
  onClick?: () => void;
};

const KIND_STYLES = {
  noir: {
    IMMUTABLE:
      "border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_15%,transparent)]",
    ROUTINE: "border-border bg-muted/40 text-muted-foreground opacity-75",
    SUGGESTION: "border-accent/35 bg-accent/15 text-foreground",
    default: "border-border bg-card/80 text-foreground",
    coagulated:
      "border-chart-3/60 bg-chart-3/20 text-chart-3 shadow-[0_0_16px_color-mix(in_oklch,var(--chart-3)_35%,transparent)] animate-pulse",
    task: "border-chart-3/25 bg-chart-3/10 text-chart-3",
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
  skin = "ludus",
  onClick,
}: BlockChipProps) {
  const styles = KIND_STYLES[skin];
  const blockKind = resolveBlockKind(block);
  const isImmutable = blockKind === "IMMUTABLE";
  const isCoagulated =
    coagulated || block.executionStatus === "coagulated";
  const isSkipped = block.executionStatus === "skipped";

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
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-xs transition-all",
        className,
        selected && "ring-2 ring-primary/60",
        isSkipped && "line-through opacity-40",
        onClick && "cursor-pointer",
      )}
    >
      <p className="line-clamp-2">{block.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider opacity-70">
        {blockKind ? (
          <span>{BLOCK_KIND_LABELS[blockKind]}</span>
        ) : (
          <span>{block.kind}</span>
        )}
        {block.actionCost != null ? <span>· G{block.actionCost}</span> : null}
        {block.ecosystemArea ? (
          <span>· {ECOSYSTEM_AREA_LABELS[block.ecosystemArea]}</span>
        ) : null}
      </div>
    </div>
  );
}
