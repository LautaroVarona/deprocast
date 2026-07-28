"use client";

import { useBabel } from "@/components/babel/babel-context";
import { AmazonAInventory } from "@/components/amazona/amazon-a-inventory";
import { coagulateTaskToTime } from "@/app/calendario/actions";
import { useCalendarioKeyboard } from "@/components/calendario/calendario-keyboard";
import { MagoClockHud } from "@/components/calendario/mago-clock-hud";
import { DayTrinchera } from "@/components/temporal/day-trinchera";
import { MonthBoard } from "@/components/temporal/month-board";
import {
  MissionCardDragOverlay,
  SuggestionDeck,
} from "@/components/temporal/suggestion-deck";
import {
  ViewModeSwitch,
  type CalendarViewMode,
} from "@/components/temporal/view-mode-switch";
import { WeekGrid } from "@/components/temporal/week-grid";
import { useTemporalData } from "@/hooks/use-temporal-data";
import type { AmazonAResourceDto } from "@/lib/amazona/types";
import type { EcosystemArea } from "@/lib/calendario/constants";
import {
  isMissionDragData,
  type MissionDragData,
} from "@/lib/calendario/dnd";
import type { MissionCardDto } from "@/lib/calendario/types";
import { notifyDomainRefresh } from "@/lib/domain-refresh";
import type { TemporalBlock } from "@/lib/temporal/types";
import {
  addDays,
  monthRange,
  toIsoDayKey,
  weekRangeForDate,
} from "@/lib/temporal/ranges";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function setTimeOnDay(day: Date, hours: number, minutes = 0): Date {
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function CalendarioWorkspace() {
  const { universeFetch, bumpTemporal, temporalVersion } = useBabel();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [monthAnchor, setMonthAnchor] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }));
  const [areaFilter, setAreaFilter] = useState<EcosystemArea | null>(null);
  const [deckCards, setDeckCards] = useState<MissionCardDto[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<MissionCardDto | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TemporalBlock | null>(null);
  const [selectedAmazona, setSelectedAmazona] =
    useState<AmazonAResourceDto | null>(null);
  const [activeSlotDay, setActiveSlotDay] = useState<string | null>(null);
  const [coagulating, setCoagulating] = useState(false);
  const [activeDrag, setActiveDrag] = useState<MissionDragData | null>(null);
  const [bounceKey, setBounceKey] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const weekRange = weekRangeForDate(weekAnchor);
  const month = monthRange(monthAnchor.year, monthAnchor.month);

  const rangeFrom =
    viewMode === "month"
      ? month.from
      : viewMode === "week"
        ? weekRange.from
        : addDays(new Date(), -1);
  const rangeTo =
    viewMode === "month"
      ? month.to
      : viewMode === "week"
        ? weekRange.to
        : addDays(new Date(), 2);

  const { blocks, isLoading, refresh } = useTemporalData({
    mode: "range",
    fromIso: rangeFrom.toISOString(),
    toIso: rangeTo.toISOString(),
  });

  const filteredBlocks = useMemo(() => {
    if (!areaFilter) return blocks;
    return blocks.filter((b) => b.ecosystemArea === areaFilter);
  }, [blocks, areaFilter]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekRange.from, i)),
    [weekRange.from],
  );

  const todayKey = toIsoDayKey(new Date());
  const yesterdayKey = toIsoDayKey(addDays(new Date(), -1));
  const tomorrowKey = toIsoDayKey(addDays(new Date(), 1));

  const dayBlocks = useMemo(
    () => ({
      yesterday: filteredBlocks.filter((b) => b.start.slice(0, 10) === yesterdayKey),
      today: filteredBlocks.filter((b) => b.start.slice(0, 10) === todayKey),
      tomorrow: filteredBlocks.filter((b) => b.start.slice(0, 10) === tomorrowKey),
    }),
    [filteredBlocks, yesterdayKey, todayKey, tomorrowKey],
  );

  const refreshDeck = useCallback(async () => {
    setDeckLoading(true);
    try {
      const params = new URLSearchParams();
      if (areaFilter) params.set("area", areaFilter);
      const response = await universeFetch(
        `/api/calendario/deck?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("No se pudo cargar el mazo.");
      const data = (await response.json()) as { cards?: MissionCardDto[] };
      setDeckCards(data.cards ?? []);
    } catch {
      setDeckCards([]);
    } finally {
      setDeckLoading(false);
    }
  }, [universeFetch, areaFilter, temporalVersion]);

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
          if (outcome.collision) {
            setBounceKey((k) => k + 1);
            toast.error(outcome.error, {
              description: `Inmutable: ${outcome.collision.blockTitle}`,
            });
            return;
          }
          throw new Error(outcome.error);
        }

        bumpTemporal();
        await Promise.all([refresh(), refreshDeck()]);
        setSelectedCard(null);
        toast.success(
          `Misión coagulada · +${outcome.result.signalPreview} Señal (preview)`,
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

  const handleCoagulate = useCallback(
    async (slotDay?: Date, hour = 10) => {
      if (!selectedCard) {
        toast.message("Seleccioná una carta del mazo primero.");
        return;
      }
      const day =
        slotDay ??
        (activeSlotDay
          ? setTimeOnDay(new Date(`${activeSlotDay}T12:00:00`), hour)
          : setTimeOnDay(new Date(), hour));
      const target = setTimeOnDay(day, hour);
      await runCoagulate(selectedCard, target);
    },
    [selectedCard, activeSlotDay, runCoagulate],
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
      const target = setTimeOnDay(new Date(`${dayKey}T12:00:00`), hour);
      setActiveSlotDay(dayKey);
      await runCoagulate(dragData.card, target);
    },
    [runCoagulate],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  const patchExecution = useCallback(
    async (block: TemporalBlock, executionStatus: string) => {
      if (block.kind !== "event") return;
      try {
        const response = await universeFetch(
          `/api/calendario/blocks/${block.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ executionStatus }),
          },
        );
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "No se pudo actualizar.");
        }
        bumpTemporal();
        await refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al actualizar rutina.",
        );
      }
    },
    [universeFetch, bumpTemporal, refresh],
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
      if (!response.ok) throw new Error("No se pudo reprogramar.");
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
      const original = new Date(originalStartIso);
      const next = new Date(day);
      next.setHours(original.getHours(), original.getMinutes(), 0, 0);
      const response = await universeFetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurredAt: next.toISOString() }),
      });
      if (!response.ok) throw new Error("No se pudo reprogramar.");
      bumpTemporal();
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error de reprogramación.",
      );
    }
  };

  const handleAssignAmazona = useCallback(
    async (resourceId: string, day: Date) => {
      try {
        const body =
          selectedBlock?.kind === "event"
            ? { resourceId, eventId: selectedBlock.id }
            : {
                resourceId,
                occurredAt: setTimeOnDay(day, 10).toISOString(),
                durationMin: 30,
              };

        const response = await universeFetch("/api/amazona/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Asignación fallida.");
        notifyDomainRefresh("all", "amazona-assign");
        bumpTemporal();
        await refresh();
        toast.success(
          selectedBlock?.kind === "event"
            ? "Recurso AmazonA anclado al bloque."
            : "Recurso AmazonA coagulado en el día.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo asignar el recurso.",
        );
      }
    },
    [selectedBlock, universeFetch, bumpTemporal, refresh],
  );

  useCalendarioKeyboard({
    viewMode,
    onViewModeChange: setViewMode,
    selectedCard,
    selectedBlock,
    onCoagulate: () => void handleCoagulate(),
    onSkipRoutine: () => {
      if (selectedBlock) void patchExecution(selectedBlock, "skipped");
    },
    onConfirmRoutine: () => {
      if (selectedBlock) void patchExecution(selectedBlock, "confirmed_day");
    },
    areaFilter,
    onAreaFilterChange: setAreaFilter,
  });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={(e) => void handleDragEnd(e)}
      onDragCancel={handleDragCancel}
    >
      <div
        data-bounce={bounceKey % 2 === 1 ? "1" : undefined}
        className="calendario-noir-root flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-zinc-100"
        style={
          bounceKey > 0
            ? { animation: "tablero-bounce 0.45s ease-in-out" }
            : undefined
        }
      >
        <header className="shrink-0 border-b border-zinc-800 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-5 text-[#FFB000]" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#FFB000]/70">
                  Tablero del Tiempo
                </p>
                <h1 className="text-lg font-semibold text-zinc-100">
                  Castillo · Campamento · Trinchera
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MagoClockHud />
              <ViewModeSwitch mode={viewMode} onChange={setViewMode} skin="noir" />
              <Link
                href="/ludus/campamento"
                className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-[#FFB000]"
              >
                Campamento Ludus →
              </Link>
            </div>
          </div>
          <p className="mt-2 font-mono text-[10px] text-zinc-500">
            1·2·3 dimensiones · Arrastrá del Mazo al grid · Enter coagular · C/S rutinas
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
          {viewMode === "week" ? (
            <div className="order-2 flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:order-1 lg:w-72">
              <SuggestionDeck
                cards={deckCards}
                isLoading={deckLoading || coagulating}
                selectedCardId={selectedCard?.id ?? null}
                areaFilter={areaFilter}
                onAreaFilterChange={setAreaFilter}
                onSelectCard={setSelectedCard}
                skin="noir"
                draggingCardId={activeDrag?.card.id ?? null}
              />
              <AmazonAInventory
                skin="noir"
                selectedResourceId={selectedAmazona?.id ?? null}
                onSelectResource={setSelectedAmazona}
                className="min-h-[10rem] lg:max-h-[35%]"
              />
            </div>
          ) : null}

          <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:order-2">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-zinc-500">
                <Loader2Icon className="size-4 animate-spin" />
                Cargando tablero…
              </div>
            ) : viewMode === "month" ? (
              <MonthBoard
                year={monthAnchor.year}
                month={monthAnchor.month}
                blocks={filteredBlocks}
                skin="noir"
                onMonthChange={(y, m) => setMonthAnchor({ year: y, month: m })}
              />
            ) : viewMode === "week" ? (
              <WeekGrid
                weekDays={weekDays}
                blocks={filteredBlocks}
                skin="noir"
                hourGrid
                selectedBlockId={selectedBlock?.id}
                onSelectBlock={setSelectedBlock}
                onRescheduleTask={handleRescheduleTask}
                onRescheduleEvent={handleRescheduleEvent}
                activeSlotDay={activeSlotDay}
                onSlotClick={(day, hour) => {
                  setActiveSlotDay(toIsoDayKey(day));
                  if (selectedCard) void handleCoagulate(day, hour ?? 10);
                  else if (selectedAmazona)
                    void handleAssignAmazona(selectedAmazona.id, day);
                }}
                onAssignAmazona={handleAssignAmazona}
              />
            ) : (
              <DayTrinchera
                yesterday={dayBlocks.yesterday}
                today={dayBlocks.today}
                tomorrow={dayBlocks.tomorrow}
                skin="noir"
                selectedBlockId={selectedBlock?.id}
                onSelectBlock={setSelectedBlock}
                onConfirmRoutine={(b) => void patchExecution(b, "confirmed_day")}
                onSkipRoutine={(b) => void patchExecution(b, "skipped")}
              />
            )}
          </div>

          {viewMode !== "week" ? (
            <div className="order-3 flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-64">
              <AmazonAInventory
                skin="noir"
                selectedResourceId={selectedAmazona?.id ?? null}
                onSelectResource={setSelectedAmazona}
                className="min-h-[12rem] lg:max-h-[45%]"
              />
              <SuggestionDeck
                cards={deckCards}
                isLoading={deckLoading || coagulating}
                selectedCardId={selectedCard?.id ?? null}
                areaFilter={areaFilter}
                onAreaFilterChange={setAreaFilter}
                onSelectCard={setSelectedCard}
                skin="noir"
                draggingCardId={activeDrag?.card.id ?? null}
              />
            </div>
          ) : null}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? <MissionCardDragOverlay card={activeDrag.card} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
