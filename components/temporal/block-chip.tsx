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
      "border-cyan-400/50 bg-cyan-950/40 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.15)]",
    ROUTINE: "border-white/15 bg-white/5 text-zinc-300 opacity-75",
    SUGGESTION: "border-violet-400/35 bg-violet-950/30 text-violet-100",
    default: "border-zinc-700/50 bg-zinc-900/60 text-zinc-200",
    coagulated:
      "border-emerald-400/60 bg-emerald-950/50 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.35)] animate-pulse",
    task: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  },
  ludus: {
    IMMUTABLE:
      "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
    ROUTINE: "border-white/10 bg-black/30 text-white/60 opacity-80",
    SUGGESTION: "border-violet-500/30 bg-violet-500/10 text-violet-100",
    default: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    coagulated:
      "border-emerald-500/40 bg-emerald-500/20 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    task: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  },
} as const;

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

  let className = block.kind === "task" ? styles.task : styles.default;
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
        selected && "ring-2 ring-cyan-400/60",
        isSkipped && "line-through opacity-40",
        onClick && "cursor-pointer",
      )}
    >
      <p className="line-clamp-2">{block.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider opacity-70">
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
