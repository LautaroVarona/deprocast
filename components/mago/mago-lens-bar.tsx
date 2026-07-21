"use client";

import { MAGO_LENSES, type MagoLensId } from "@/lib/mago/tradition";
import type { MagoFilter } from "@/lib/mago/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type MagoLensBarProps = {
  activeId: MagoLensId;
};

export function MagoLensBar({ activeId }: MagoLensBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {MAGO_LENSES.map((lens) => (
        <Link
          key={lens.id}
          href={lens.href}
          className={cn(
            "rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
            activeId === lens.id
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-border text-muted-foreground hover:border-border hover:text-muted-foreground",
          )}
        >
          {lens.label}
        </Link>
      ))}
    </div>
  );
}

export function getFilterForLens(lensId: MagoLensId): MagoFilter {
  const lens = MAGO_LENSES.find((entry) => entry.id === lensId);
  return lens?.filter ?? "total";
}
