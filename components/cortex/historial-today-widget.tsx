"use client";

import { useBabel } from "@/components/babel/babel-context";
import {
  CATEGORY_ICONS,
  formatTime,
  resolveSourceLink,
} from "@/components/historial/historial-utils";
import type { ActivityEntry } from "@/lib/historial/types";
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
} from "@/lib/historial/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRightIcon,
  BotIcon,
  CpuIcon,
  HistoryIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function CortexActivityItem({ entry }: { entry: ActivityEntry }) {
  const sourceLink = resolveSourceLink(entry);

  return (
    <div className="rounded-lg border border-border/80 bg-background/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden>{CATEGORY_ICONS[entry.category] ?? "📋"}</span>
        <time className="font-mono text-[10px] text-muted-foreground">
          {formatTime(entry.occurredAt)}
        </time>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
          {CATEGORY_LABELS[entry.category] ?? entry.category}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/80">
          {ACTION_LABELS[entry.action] ?? entry.action}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium">{entry.title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {entry.agentName ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
            <BotIcon className="size-3" />
            {entry.agentName}
          </span>
        ) : null}
        {entry.modelUsed ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-700 dark:text-cyan-300">
            <CpuIcon className="size-3" />
            {entry.modelUsed}
          </span>
        ) : null}
      </div>
      {sourceLink ? (
        <Link
          href={sourceLink}
          className="mt-2 inline-flex text-xs text-primary hover:underline"
        >
          Ver detalle →
        </Link>
      ) : null}
    </div>
  );
}

export function HistorialTodayWidget() {
  const { universeFetch, universeSlug, isLoading: isUniverseLoading } = useBabel();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const params = new URLSearchParams({ day: dayKey, limit: "5" });
      const response = await universeFetch(`/api/historial?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setEntries([]);
        return;
      }
      const data = (await response.json()) as { entries: ActivityEntry[] };
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void fetchToday();
  }, [fetchToday, universeSlug, isUniverseLoading]);

  return (
    <section
      aria-label="Actividad de hoy"
      className="rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-cyan-500" />
          <div>
            <h2 className="text-sm font-medium tracking-wide text-foreground uppercase">
              Actividad de hoy
            </h2>
            <p className="text-xs text-muted-foreground">
              Ingesta, audio, validación y agentes — con IA atribuida
            </p>
          </div>
        </div>
        <Link
          href="/historial"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 gap-1.5",
          )}
        >
          Historial
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Cargando actividad…
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin actividad registrada hoy. Las capturas y procesamientos aparecerán acá.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <CortexActivityItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
