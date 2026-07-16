"use client";

import { useBabel } from "@/components/babel/babel-context";
import { UniverseSwitcher } from "@/components/babel/universe-switcher";
import { CampamentoMonthView } from "@/components/ludus/campamento/campamento-month-view";
import { CampamentoWeekGrid } from "@/components/ludus/campamento/campamento-week-grid";
import { QuickIdeasPanel } from "@/components/ludus/campamento/quick-ideas-panel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTemporalData } from "@/hooks/use-temporal-data";
import { addDays, monthRange, weekRangeForDate } from "@/lib/temporal/ranges";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { GridBottomNavWithPlus } from "@/components/grid/grid-bottom-nav";

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
        body: JSON.stringify({ action: "reschedule", targetDay: day.toISOString() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo reprogramar.");
      bumpTemporal();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de reprogramación.");
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
      if (!response.ok) throw new Error(data.error ?? "No se pudo reprogramar evento.");
      bumpTemporal();
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error de reprogramación de evento.",
      );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#040505]">
      <header className="border-b border-white/[0.06] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
          Campamento · Planificador
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
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

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-white/40">
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

            <section className="rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
                Forja meso
              </p>
              <p className="mt-1 text-sm text-white/80">
                Energía semanal + microtareas. Gestioná acá la transición.
              </p>
              <div className="mt-3">
                <Link
                  href="/ludus/campamento/forja"
                  className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
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
