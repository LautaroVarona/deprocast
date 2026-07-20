"use client";

import { HistorialTrigger } from "@/components/historial/historial-sheet";
import { LudusAreaNav } from "@/components/ludus/ludus-area-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, Gamepad2Icon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type LudusHeaderProps = {
  signalPoints?: number;
  onOpenCommandMenu?: () => void;
};

export function LudusHeader({ signalPoints = 0, onOpenCommandMenu }: LudusHeaderProps) {
  const pathname = usePathname();
  const showAreaNav = !pathname.startsWith("/ludus/trinchera/foco");

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-14 w-full items-center gap-4 px-4 sm:px-6">
        <Link href="/ludus" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300">
            <Gamepad2Icon className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">Ludus</span>
        </Link>

        <p className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
          Modo videojuego
        </p>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {onOpenCommandMenu ? (
            <button
              type="button"
              onClick={onOpenCommandMenu}
              className={cn(
                "hidden items-center gap-1.5 rounded-full border border-border px-3 py-1",
                "font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground sm:inline-flex",
              )}
            >
              <span className="rounded border border-border px-1 py-0.5">ESC</span>
              Menú
            </button>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-amber-500/25",
              "bg-amber-500/10 px-3 py-1 font-mono text-[10px] text-amber-700 dark:text-amber-200/90",
            )}
          >
            <SparklesIcon className="size-3" aria-hidden />
            {signalPoints} Puntos de Señal
          </span>
          <ThemeToggle />
          <HistorialTrigger variant="ghost" className="hidden sm:inline-flex" />
          <HistorialTrigger variant="ghost" showLabel={false} className="sm:hidden" />
          <Link
            href="/yo"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeftIcon className="size-3.5" />
            Yo
          </Link>
        </div>
      </div>
      {showAreaNav ? <LudusAreaNav /> : null}
    </header>
  );
}
