"use client";

import type { TemporalBlock } from "@/lib/temporal/types";
import { cn } from "@/lib/utils";

type TemporalBlockChipProps = {
  block: TemporalBlock;
  draggable?: boolean;
};

export function TemporalBlockChip({ block, draggable = false }: TemporalBlockChipProps) {
  return (
    <div
      draggable={draggable}
      data-block-id={block.id}
      data-block-kind={block.kind}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-xs",
        block.kind === "task"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
          : "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
      )}
    >
      <p className="line-clamp-2">{block.title}</p>
      <p className="mt-1 font-mono text-[10px] opacity-70">{block.kind}</p>
    </div>
  );
}
