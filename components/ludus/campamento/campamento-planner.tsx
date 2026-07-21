"use client";

import { useBabel } from "@/components/babel/babel-context";
import { UniverseSwitcher } from "@/components/babel/universe-switcher";
import { CampamentoGeoMap } from "@/components/ludus/campamento/campamento-geo-map";
import { CampamentoMonthView } from "@/components/ludus/campamento/campamento-month-view";
import { CampamentoWeekGrid } from "@/components/ludus/campamento/campamento-week-grid";
import { QuickIdeasPanel } from "@/components/ludus/campamento/quick-ideas-panel";
import { Button } from "@/components/ui/button";
import { GridBottomNavWithPlus } from "@/components/grid/grid-bottom-nav";
import { useTemporalData } from "@/hooks/use-temporal-data";
import { addDays, monthRange, weekRangeForDate } from "@/lib/temporal/ranges";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2Icon, MapIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type CampamentoView = "planner" | "mapa";

export function CampamentoPlanner() {
  const {
    plannerMode,
    setPlannerMode,
    weekAnchor,
    goToPrevWeek,
    goToNextWeek,
    monthAnchor,
    setMonthAnchor,
    goToPrevMonth,
    goToNextMonth,
    universeFetch,
    bumpTemporal,
  } = useBabel();

  const [view, setView] = useState<CampamentoView>("planner");

  const weekRange = weekRangeForDate(weekAnchor);
  const month = monthRange(monthAnchor.year, monthAnchor.month);
  const activeFrom = plannerMode === "week" ? weekRange.from : month.from;
  const activeTo = plannerMode === "week" ? weekRange.to : month.to;

  const { blocks, isLoading, refresh } = useTemporalData({
    mode: "range",
    fromIso: activeFrom.toISOString(),
    toIso: activeTo.toISOString(),
  });

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekRange.from, index),
  );

  const handleRescheduleTask = async (taskId: string, day: Date) => {
    try {
      const response = await universeFetch(`/api/pendientes/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          targetDay: day.toISOString(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo reprogramar.");
      bumpTemporal();
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error de reprogramación.",
      );
    }
  };

  const handleRescheduleEvent = async (
    eventId: string,
    day: Date,
    originalStartIso: string,
  ) => {
    try {
      const originalDate = new Date(originalStartIso);
      if (Number.isNaN(originalDate.getTime())) {
        throw new Error("Evento inválido para reprogramar.");
      }
      const nextOccurredAt = new Date(day);
      nextOccurredAt.setHours(
        originalDate.getHours(),
        originalDate.getMinutes(),
        originalDate.getSeconds(),
        originalDate.getMilliseconds(),
      );

      const response = await universeFetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurredAt: nextOccurredAt.toISOString() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo reprogramar evento.");
      }
      bumpTemporal();
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error de reprogramación de evento.",
      );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="border-b border-border/[0.06] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
          Campamento · {view === "mapa" ? "Mapa" : "Planificador"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setView("planner")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                view === "planner"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              <CalendarIcon className="size-3" />
              Planner
            </button>
            <button
              type="button"
              onClick={() => setView("mapa")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                view === "mapa"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              <MapIcon className="size-3" />
              Mapa
            </button>
          </div>

          {view === "planner" ? (
            <>
              <Button
                variant={plannerMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlannerMode("week")}
              >
                Semana
              </Button>
              <Button
                variant={plannerMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlannerMode("month")}
              >
                Mes
              </Button>
            </>
          ) : null}

          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={plannerMode === "week" ? goToPrevWeek : goToPrevMonth}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={plannerMode === "week" ? goToNextWeek : goToNextMonth}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </header>

      <UniverseSwitcher />

      <div className="min-h-0 flex-1 overflow-hidden p-4 transition-opacity duration-300">
        {view === "mapa" ? (
          <CampamentoGeoMap
            fromIso={activeFrom.toISOString()}
            toIso={activeTo.toISOString()}
            onActionDone={() => void refresh()}
          />
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            {plannerMode === "week" ? (
              <CampamentoWeekGrid
                weekDays={weekDays}
                blocks={blocks}
                onRescheduleTask={handleRescheduleTask}
                onRescheduleEvent={handleRescheduleEvent}
              />
            ) : (
              <CampamentoMonthView
                year={monthAnchor.year}
                month={monthAnchor.month}
                blocks={blocks}
                onMonthChange={setMonthAnchor}
              />
            )}

            <section className="rounded-xl border border-border bg-card/80 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Forja meso
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Energía semanal + microtareas. Gestioná acá la transición.
              </p>
              <div className="mt-3">
                <Link
                  href="/ludus/campamento/forja"
                  className="inline-flex items-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  Abrir Forja →
                </Link>
              </div>
            </section>
            <QuickIdeasPanel onCreated={() => void refresh()} />
          </div>
        )}
      </div>

      <GridBottomNavWithPlus ludusMode />
    </div>
  );
}
