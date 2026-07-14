"use client";

import { useBabel } from "@/components/babel/babel-context";
import type { ActivityEntry } from "@/lib/historial/types";
import {
  ACTION_LABELS,
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/historial/types";
import { cn } from "@/lib/utils";
import {
  BotIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuIcon,
  DownloadIcon,
  HistoryIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

type ActivityDayGroup = {
  dayKey: string;
  dayLabel: string;
  entries: ActivityEntry[];
};

const CATEGORY_ICONS: Record<string, string> = {
  ingesta: "📥",
  audio: "🎙️",
  purifier: "🧪",
  validation: "✅",
  chat: "💬",
  events: "📅",
  salud: "🫀",
  kg: "🕸️",
  molecular: "🔬",
  meta: "🏷️",
  cuadernos: "📓",
  ludus: "⚔️",
  vibe: "🎛️",
  journal: "📔",
  backup: "💾",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolveSourceLink(entry: ActivityEntry): string | null {
  if (entry.category === "purifier" || entry.category === "validation") {
    return entry.correlationId ? `/validar?id=${entry.correlationId}` : "/validar";
  }
  if (entry.category === "audio" && entry.sourceRef) {
    return `/audio/${entry.sourceRef}`;
  }
  if (entry.category === "chat") {
    return "/chat";
  }
  if (entry.category === "journal") {
    return "/diario";
  }
  if (entry.category === "meta") {
    return "/agentes";
  }
  if (entry.category === "ingesta") {
    return "/ingesta";
  }
  if (entry.category === "salud") {
    return "/salud";
  }
  return null;
}

function ActivityEntryRow({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const sourceLink = resolveSourceLink(entry);
  const stageAgents = Array.isArray(entry.metadata.stageAgents)
    ? (entry.metadata.stageAgents as Array<{
        station: number;
        name: string;
        agentName: string;
      }>)
    : [];
  const healthMetrics =
    entry.category === "salud" &&
    entry.metadata.metrics &&
    typeof entry.metadata.metrics === "object"
      ? (entry.metadata.metrics as Record<string, unknown>)
      : null;
  const macroTotals =
    healthMetrics?.totals && typeof healthMetrics.totals === "object"
      ? (healthMetrics.totals as {
          calories?: number;
          proteinG?: number;
          carbsG?: number;
          fatG?: number;
        })
      : null;

  return (
    <article className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 transition hover:border-cyan-500/20">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left sm:p-4"
      >
        <span className="mt-0.5 text-lg" aria-hidden>
          {CATEGORY_ICONS[entry.category] ?? "📋"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <time className="font-mono text-[10px] text-zinc-500">
              {formatTime(entry.occurredAt)}
            </time>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              {CATEGORY_LABELS[entry.category] ?? entry.category}
            </span>
            <span className="rounded-full border border-zinc-700/80 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
          </div>

          <h3 className="mt-1 text-sm font-medium text-zinc-100">{entry.title}</h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.agentName ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                <BotIcon className="size-3" />
                {entry.agentName}
              </span>
            ) : null}
            {entry.modelUsed ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                <CpuIcon className="size-3" />
                {entry.modelUsed}
              </span>
            ) : null}
          </div>
        </div>

        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-zinc-500 transition",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className="border-t border-zinc-800/60 px-4 pb-4 pt-3 text-xs text-zinc-400">
          {entry.summary ? (
            <p className="mb-3 leading-relaxed text-zinc-400">{entry.summary}</p>
          ) : null}

          {macroTotals ? (
            <div className="mb-3 flex flex-wrap gap-2 font-mono text-[10px] text-emerald-300/90">
              {typeof macroTotals.calories === "number" ? (
                <span>{Math.round(macroTotals.calories)} kcal</span>
              ) : null}
              {typeof macroTotals.proteinG === "number" ? (
                <span>P {Math.round(macroTotals.proteinG)}g</span>
              ) : null}
              {typeof macroTotals.carbsG === "number" ? (
                <span>C {Math.round(macroTotals.carbsG)}g</span>
              ) : null}
              {typeof macroTotals.fatG === "number" ? (
                <span>G {Math.round(macroTotals.fatG)}g</span>
              ) : null}
            </div>
          ) : null}

          {stageAgents.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Agentes por estación
              </p>
              <ul className="space-y-1">
                {stageAgents.map((stage) => (
                  <li key={`${stage.station}-${stage.name}`} className="text-zinc-400">
                    Est. {stage.station} · {stage.name} →{" "}
                    <span className="text-emerald-300/90">{stage.agentName}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <dl className="grid gap-1 font-mono text-[10px] text-zinc-500 sm:grid-cols-2">
            {entry.sourceType ? (
              <>
                <dt>Fuente</dt>
                <dd>{entry.sourceType}</dd>
              </>
            ) : null}
            {entry.sourceRef ? (
              <>
                <dt>Ref</dt>
                <dd className="truncate">{entry.sourceRef}</dd>
              </>
            ) : null}
            {entry.correlationId ? (
              <>
                <dt>Correlación</dt>
                <dd className="truncate">{entry.correlationId}</dd>
              </>
            ) : null}
          </dl>

          {sourceLink ? (
            <Link
              href={sourceLink}
              className="mt-3 inline-flex text-cyan-400/80 hover:text-cyan-300 hover:underline"
            >
              Ver en la plataforma →
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function HistorialWorkspace() {
  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();
  const [groups, setGroups] = useState<ActivityDayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const totalEntries = useMemo(
    () => groups.reduce((sum, g) => sum + g.entries.length, 0),
    [groups],
  );

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ grouped: "true", days: "14" });
      if (category !== "all") params.set("category", category);
      if (selectedDay) params.set("day", selectedDay);

      const response = await universeFetch(`/api/historial?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar historial");
      }

      const data = (await response.json()) as { groups: ActivityDayGroup[] };
      setGroups(data.groups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [category, selectedDay, universeFetch]);

  const runBackfillIfNeeded = useCallback(async () => {
    void universeFetch("/api/historial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backfill" }),
      }).catch(() => undefined);
  }, [universeFetch]);

  useEffect(() => {
    setGroups([]);
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

  const exportUrl = (format: "json" | "csv") => {
    const params = new URLSearchParams({ format, days: "30" });
    if (category !== "all") params.set("category", category);
    if (selectedDay) params.set("day", selectedDay);
    return `/api/historial/export?${params}`;
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
              {totalEntries} evento{totalEntries === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
                Historial
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                Log unificado de ingesta, audio, purificación, validación, chat y
                agentes — con atribución de IA y pipeline.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={exportUrl("json")}
                download
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-zinc-700 bg-zinc-900/60 text-zinc-300",
                )}
              >
                <DownloadIcon className="size-3.5" />
                JSON
              </a>
              <a
                href={exportUrl("csv")}
                download
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-zinc-700 bg-zinc-900/60 text-zinc-300",
                )}
              >
                <DownloadIcon className="size-3.5" />
                CSV
              </a>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-4">
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
              Últimos 14 días
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
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.dayKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold capitalize text-zinc-300">
                    {group.dayLabel}
                  </h2>
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="font-mono text-[10px] text-zinc-600">
                    {group.entries.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <ActivityEntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
