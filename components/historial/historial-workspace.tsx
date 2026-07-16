"use client";

import { useBabel } from "@/components/babel/babel-context";
import type { ActivityDayGroup } from "@/components/historial/historial-day-section";
import { HistorialDaySection } from "@/components/historial/historial-day-section";
import { HistorialDayStrip, type DayCount } from "@/components/historial/historial-day-strip";
import { HistorialExportMenu } from "@/components/historial/historial-export-menu";
import { HistorialStatsBar } from "@/components/historial/historial-stats-bar";
import { toDayKey } from "@/components/historial/historial-utils";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/historial/types";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  Loader2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const DAYS_WINDOW = 30;

export function HistorialWorkspace() {
  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();
  const [groups, setGroups] = useState<ActivityDayGroup[]>([]);
  const [dayCounts, setDayCounts] = useState<DayCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [agentId, setAgentId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const allEntries = useMemo(
    () => groups.flatMap((group) => group.entries),
    [groups],
  );

  const totalEntries = allEntries.length;

  const agentCount = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of allEntries) {
      if (entry.agentId) ids.add(entry.agentId);
    }
    return ids.size;
  }, [allEntries]);

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups) {
      for (const entry of group.entries) {
        if (entry.agentId && entry.agentName) {
          map.set(entry.agentId, entry.agentName);
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "es"),
    );
  }, [groups]);

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        grouped: "true",
        days: String(DAYS_WINDOW),
      });
      if (category !== "all") params.set("category", category);
      if (agentId !== "all") params.set("agentId", agentId);
      if (selectedDay) params.set("day", selectedDay);

      const response = await universeFetch(`/api/historial?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar historial");
      }

      const data = (await response.json()) as {
        groups: ActivityDayGroup[];
        dayCounts?: DayCount[];
      };
      setGroups(data.groups ?? []);
      setDayCounts(data.dayCounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [category, agentId, selectedDay, universeFetch]);

  const runBackfillIfNeeded = useCallback(async () => {
    void universeFetch("/api/historial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "backfill" }),
    }).catch(() => undefined);
  }, [universeFetch]);

  useEffect(() => {
    setGroups([]);
    setDayCounts([]);
  }, [universeSlug]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void runBackfillIfNeeded().then(() => fetchHistorial());
  }, [runBackfillIfNeeded, fetchHistorial, universeSlug, isUniverseLoading]);

  const shiftDay = (delta: number) => {
    const base = selectedDay ? new Date(`${selectedDay}T12:00:00`) : new Date();
    base.setDate(base.getDate() + delta);
    setSelectedDay(toDayKey(base));
  };

  return (
    <div className="min-h-full bg-slate-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="space-y-4 border-b border-zinc-800/80 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <HistoryIcon className="size-3.5" />
              Registro de actividad
            </span>
            <span className="text-xs text-zinc-500">
              {totalEntries} evento{totalEntries === 1 ? "" : "s"} · últimos{" "}
              {DAYS_WINDOW} días
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
                Historial
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                Log unificado de ingesta, audio, purificación, validación, chat,
                cuadernos, molecular, KG, vibe, enciclopedia y respaldo — con
                atribución de agente e IA por intervención. Exportable para
                análisis automático o revisión por coaches y profesionales.
              </p>
            </div>

            <HistorialExportMenu
              category={category}
              agentId={agentId}
              selectedDay={selectedDay}
              days={DAYS_WINDOW}
            />
          </div>
        </header>

        {!isLoading && allEntries.length > 0 ? (
          <HistorialStatsBar entries={allEntries} agentCount={agentCount} />
        ) : null}

        <div className="flex flex-col gap-4">
          {dayCounts.length > 0 ? (
            <HistorialDayStrip
              dayCounts={dayCounts}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-400"
              onClick={() => shiftDay(-1)}
              aria-label="Día anterior"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "border-zinc-700 font-mono text-xs",
                !selectedDay && "border-cyan-500/40 text-cyan-300",
              )}
              onClick={() => setSelectedDay(null)}
            >
              Todos los días
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-400"
              onClick={() => shiftDay(1)}
              aria-label="Día siguiente"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
            {selectedDay ? (
              <span className="font-mono text-xs text-zinc-500">{selectedDay}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                category === "all"
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                  : "border-zinc-700 text-zinc-500 hover:border-zinc-600",
              )}
            >
              Todos
            </button>
            {ACTIVITY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                  category === cat
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-zinc-700 text-zinc-500 hover:border-zinc-600",
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {agentOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                Agente
              </span>
              <button
                type="button"
                onClick={() => setAgentId("all")}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                  agentId === "all"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700 text-zinc-500 hover:border-zinc-600",
                )}
              >
                Todos
              </button>
              {agentOptions.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAgentId(id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider transition",
                    agentId === id
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-zinc-700 text-zinc-500 hover:border-zinc-600",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
            <Loader2Icon className="size-5 animate-spin" />
            Cargando historial…
          </div>
        ) : error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </p>
        ) : groups.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            No hay actividad registrada para este período.
          </p>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <HistorialDaySection
                key={group.dayKey}
                group={group}
                stickyHeader
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
