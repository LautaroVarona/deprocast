"use client";

import { buttonVariants } from "@/components/ui/button";
import type { LudusArea } from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import { LockIcon } from "lucide-react";
import Link from "next/link";

type LudusLockedAreaProps = {
  area: LudusArea;
};

export function LudusLockedArea({ area }: LudusLockedAreaProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
        <LockIcon className="size-7" aria-hidden />
      </span>
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
          Área bloqueada
        </p>
        <h1 className="text-2xl font-semibold text-white">{area.name}</h1>
        <p className="text-sm text-white/50">{area.description}</p>
        <p className="font-mono text-[11px] text-white/30">{area.lore}</p>
      </div>
      <Link
        href="/ludus"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "border-white/15 bg-white/5 text-white hover:bg-white/10",
        )}
      >
        Volver al mapa
      </Link>
    </div>
  );
}
