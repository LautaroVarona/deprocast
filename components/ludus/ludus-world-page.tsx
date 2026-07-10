"use client";

import { LudusWorldMap } from "@/components/ludus/ludus-world-map";
import { Button } from "@/components/ui/button";
import { LUDUS_STATUES } from "@/lib/ludus/constants";
import type { LudusWorldStats } from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import { Loader2Icon, TrophyIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function LudusWorldPage() {
  const [stats, setStats] = useState<LudusWorldStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/ludus/stats", { cache: "no-store" });
      if (!response.ok) return;
      const data: LudusWorldStats = await response.json();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unlock = async (statueId: string) => {
    setUnlockingId(statueId);
    try {
      const response = await fetch("/api/ludus/statues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statueId }),
      });
      const data = (await response.json()) as LudusWorldStats & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Error.");
      setStats(data);
      toast.success("Estatua desbloqueada en el Castillo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al desbloquear.");
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto">
      <LudusWorldMap stats={stats} isLoading={isLoading} />

      {stats ? (
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="castillo-card space-y-4 p-5">
            <div className="flex items-center gap-2">
              <TrophyIcon className="size-4 text-amber-300" />
              <h2 className="font-medium text-white">
                Estatuas del Castillo
              </h2>
              <span className="ml-auto font-mono text-[10px] text-amber-300/70">
                {stats.signalPoints} PS disponibles
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {LUDUS_STATUES.map((statue) => {
                const unlocked = stats.unlockedStatues.includes(statue.id);
                const canAfford = stats.signalPoints >= statue.cost;
                return (
                  <li
                    key={statue.id}
                    className={cn(
                      "rounded-xl border p-4",
                      unlocked
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-white/8 bg-black/25",
                    )}
                  >
                    <p className="font-medium text-white">{statue.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {statue.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-amber-200/80">
                        {statue.cost} PS
                      </span>
                      {unlocked ? (
                        <span className="font-mono text-[10px] text-emerald-300">
                          Desbloqueada
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canAfford || unlockingId === statue.id}
                          className="h-7 border-amber-500/30 text-xs text-amber-200"
                          onClick={() => void unlock(statue.id)}
                        >
                          {unlockingId === statue.id ? (
                            <Loader2Icon className="size-3 animate-spin" />
                          ) : (
                            "Desbloquear"
                          )}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
