"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, Gamepad2Icon, SparklesIcon } from "lucide-react";
import Link from "next/link";

type LudusHeaderProps = {
  signalPoints?: number;
};

export function LudusHeader({ signalPoints = 0 }: LudusHeaderProps) {
  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-white/10 bg-[#0a0a0c]/95 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-4 px-4 sm:px-6">
        <Link href="/ludus" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
            <Gamepad2Icon className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            Ludus
          </span>
        </Link>

        <p className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 sm:block">
          Modo videojuego
        </p>

        <div className="ml-auto flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-amber-500/25",
              "bg-amber-500/10 px-3 py-1 font-mono text-[10px] text-amber-200/90",
            )}
          >
            <SparklesIcon className="size-3" aria-hidden />
            {signalPoints} Puntos de Señal
          </span>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-white/15 bg-white/5 text-white hover:bg-white/10",
            )}
          >
            <ArrowLeftIcon className="size-3.5" />
            Salir
          </Link>
        </div>
      </div>
    </header>
  );
}
