"use client";

import { useBabel } from "@/components/babel/babel-context";
import { DayNavigator } from "@/components/grid/day-navigator";
import { TrincheraDayFocus } from "@/components/ludus/trinchera/trinchera-day-focus";
import { TrincheraFocusDock } from "@/components/ludus/trinchera/trinchera-focus-dock";
import { TrincheraSessionProvider } from "@/components/ludus/trinchera/trinchera-session-context";
import { buttonVariants } from "@/components/ui/button";
import type { TrincheraSnapshot } from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  Loader2Icon,
  ShieldIcon,
  SignalIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function TrincheraWorkspace() {
  const { selectedDay, setSelectedDay } = useBabel();
  const [snapshot, setSnapshot] = useState<TrincheraSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { bumpTemporal } = useBabel();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/ludus/trinchera", { cache: "no-store" });
      if (!response.ok) throw new Error("Error al cargar.");
      setSnapshot(await response.json());
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar la Trinchera.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TrincheraSessionProvider
      onRefresh={() => {
        bumpTemporal();
        void load();
      }}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border/[0.06] px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/ludus/campamento"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "shrink-0 text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowLeftIcon className="size-3.5" />
              Campamento
            </Link>
            <ShieldIcon className="size-4 shrink-0 text-destructive/80" />
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
              Trinchera
            </h1>
          </div>

          {snapshot ? (
            <div className="flex shrink-0 items-center gap-4">
              <div className="flex items-center gap-2">
                <SignalIcon className="size-3.5 text-accent" />
                <div className="text-right">
                  <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                    Señal
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-accent">
                    {snapshot.signalPoints}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldIcon className="size-3.5 text-destructive" />
                <div className="text-right">
                  <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                    Racha
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {snapshot.assaultStreakToday}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <DayNavigator selectedDay={selectedDay} onDayChange={setSelectedDay} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <TrincheraDayFocus
            onRefreshSnapshot={() => void load()}
          />
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : snapshot ? (
            <TrincheraFocusDock snapshot={snapshot} />
          ) : null}
        </div>
      </div>
    </TrincheraSessionProvider>
  );
}
