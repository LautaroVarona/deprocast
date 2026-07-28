"use client";

import { coagulateTaskToTime } from "@/app/calendario/actions";
import { useBabel } from "@/components/babel/babel-context";
import { UniverseSwitcher } from "@/components/babel/universe-switcher";
import { CampamentoGeoMap } from "@/components/ludus/campamento/campamento-geo-map";
import { CampamentoMonthView } from "@/components/ludus/campamento/campamento-month-view";
import { QuickIdeasPanel } from "@/components/ludus/campamento/quick-ideas-panel";
import {
  MissionCardDragOverlay,
  SuggestionDeck,
} from "@/components/temporal/suggestion-deck";
import { WeekGrid } from "@/components/temporal/week-grid";
import { Button } from "@/components/ui/button";
import { useTemporalData } from "@/hooks/use-temporal-data";
import {
  isMissionDragData,
  type MissionDragData,
} from "@/lib/calendario/dnd";
import type { MissionCardDto } from "@/lib/calendario/types";
import { addDays, monthRange, weekRangeForDate } from "@/lib/temporal/ranges";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarIcon, Loader2Icon, MapIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CampamentoView = "planner" | "mapa";

function setTimeOnDay(day: Date, hours: number, minutes = 0): Date {
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

/** Campamento: planificación meso — grid semanal + mazo + coagulación DnD. */
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
    temporalVersion,
  } = useBabel();

  const [view, setView] = useState<CampamentoView>("planner");
  const [deckCards, setDeckCards] = useState<MissionCardDto[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<MissionCardDto | null>(null);
  const [activeDrag, setActiveDrag] = useState<MissionDragData | null>(null);
  const [coagulating, setCoagulating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  const refreshDeck = useCallback(async () => {
    setDeckLoading(true);
    try {
      const response = await universeFetch("/api/calendario/deck", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No se pudo cargar el mazo.");
      const data = (await response.json()) as { cards?: MissionCardDto[] };
      setDeckCards(data.cards ?? []);
    } catch {
      setDeckCards([]);
    } finally {
      setDeckLoading(false);
    }
  }, [universeFetch, temporalVersion]);

  useEffect(() => {
    void refreshDeck();
  }, [refreshDeck]);

  const runCoagulate = useCallback(
    async (card: MissionCardDto, target: Date) => {
      setCoagulating(true);
      try {
        const outcome = await coagulateTaskToTime({
          taskId: card.sourceId,
          cardSource: card.source,
          targetDate: target.toISOString(),
          durationMin: card.durationMin,
          ecosystemArea: card.ecosystemArea ?? undefined,
        });
        if (!outcome.ok) {
          toast.error(outcome.error, {
            description: outcome.collision
              ? `Inmutable: ${outcome.collision.blockTitle}`
              : undefined,
          });
          return;
        }
        bumpTemporal();
        await Promise.all([refresh(), refreshDeck()]);
        setSelectedCard(null);
        toast.success(
          `Coagulado · +${outcome.result.signalPreview} Señal (preview)`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo coagular.",
        );
      } finally {
        setCoagulating(false);
      }
    },
    [bumpTemporal, refresh, refreshDeck],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (isMissionDragData(event.active.data.current)) {
      setActiveDrag(event.active.data.current);
      setSelectedCard(event.active.data.current.card);
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const dragData = event.active.data.current;
      const overData = event.over?.data.current;
      setActiveDrag(null);
      if (!isMissionDragData(dragData) || !overData || overData.type !== "time-slot") {
        return;
      }
      const { dayKey, hour } = overData as { dayKey: string; hour: number };
      await runCoagulate(
        dragData.card,
        setTimeOnDay(new Date(`${dayKey}T12:00:00`), hour),
      );
    },
    [runCoagulate],
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={(e) => void handleDragEnd(e)}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFB000]/70">
            Campamento · {view === "mapa" ? "Mapa" : "Tablero táctico"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5">
              <button
                type="button"
                onClick={() => setView("planner")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  view === "planner"
                    ? "bg-[#FFB000]/15 text-[#FFB000]"
                    : "text-zinc-500 hover:text-zinc-300",
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
                    ? "bg-[#FFB000]/15 text-[#FFB000]"
                    : "text-zinc-500 hover:text-zinc-300",
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

            <Link
              href="/calendario"
              className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-[#FFB000]"
            >
              Tablero completo →
            </Link>

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
            <div className="flex h-full items-center justify-center text-zinc-500">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-3">
              {plannerMode === "week" ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
                  <SuggestionDeck
                    cards={deckCards}
                    isLoading={deckLoading || coagulating}
                    selectedCardId={selectedCard?.id ?? null}
                    onSelectCard={setSelectedCard}
                    skin="noir"
                    draggingCardId={activeDrag?.card.id ?? null}
                  />
                  <WeekGrid
                    weekDays={weekDays}
                    blocks={blocks}
                    skin="noir"
                    hourGrid
                    onRescheduleTask={handleRescheduleTask}
                    onRescheduleEvent={handleRescheduleEvent}
                    onSlotClick={(day, hour) => {
                      if (!selectedCard) {
                        toast.message("Seleccioná o arrastrá una carta del mazo.");
                        return;
                      }
                      void runCoagulate(
                        selectedCard,
                        setTimeOnDay(day, hour ?? 10),
                      );
                    }}
                  />
                </div>
              ) : (
                <CampamentoMonthView
                  year={monthAnchor.year}
                  month={monthAnchor.month}
                  blocks={blocks}
                  onMonthChange={setMonthAnchor}
                />
              )}

              <section className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Forja meso
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Energía semanal + microtareas. Trituradora → Mazo → Grid.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/ludus/campamento/forja"
                    className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300 hover:border-[#FFB000]/40 hover:text-[#FFB000]"
                  >
                    Abrir Forja →
                  </Link>
                  <Link
                    href="/ludus/trituradora"
                    className="inline-flex items-center rounded-lg border border-[#FFB000]/30 bg-[#FFB000]/10 px-3 py-2 text-sm text-[#FFB000] hover:bg-[#FFB000]/20"
                  >
                    Trituradora →
                  </Link>
                </div>
              </section>
              <QuickIdeasPanel onCreated={() => void refresh()} />
            </div>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? <MissionCardDragOverlay card={activeDrag.card} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
