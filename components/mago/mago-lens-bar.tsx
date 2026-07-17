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
              ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
              : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70",
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
