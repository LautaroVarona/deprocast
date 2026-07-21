"use client";

import { useBabel } from "@/components/babel/babel-context";
import { useCalendarioKeyboard } from "@/components/calendario/calendario-keyboard";
import { DayTrinchera } from "@/components/temporal/day-trinchera";
import { MonthBoard } from "@/components/temporal/month-board";
import { SuggestionDeck } from "@/components/temporal/suggestion-deck";
import {
  ViewModeSwitch,
  type CalendarViewMode,
} from "@/components/temporal/view-mode-switch";
import { WeekGrid } from "@/components/temporal/week-grid";
import { useTemporalData } from "@/hooks/use-temporal-data";
import type { EcosystemArea } from "@/lib/calendario/constants";
import type { MissionCardDto } from "@/lib/calendario/types";
import type { TemporalBlock } from "@/lib/temporal/types";
import {
  addDays,
  monthRange,
  toIsoDayKey,
  weekRangeForDate,
} from "@/lib/temporal/ranges";
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
  const [activeSlotDay, setActiveSlotDay] = useState<string | null>(null);
  const [coagulating, setCoagulating] = useState(false);

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

  const handleCoagulate = useCallback(
    async (slotDay?: Date) => {
      if (!selectedCard) {
        toast.message("Seleccioná una carta del mazo primero.");
        return;
      }
      const day =
        slotDay ??
        (activeSlotDay ? new Date(`${activeSlotDay}T10:00:00`) : setTimeOnDay(new Date(), 10));
      setCoagulating(true);
      try {
        const response = await universeFetch("/api/calendario/coagulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardSource: selectedCard.source,
            cardId: selectedCard.sourceId,
            occurredAt: day.toISOString(),
            durationMin: selectedCard.durationMin,
            ecosystemArea: selectedCard.ecosystemArea ?? undefined,
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          result?: { signalPreview: number };
        };
        if (!response.ok) throw new Error(data.error ?? "Coagulación fallida.");
        bumpTemporal();
        await Promise.all([refresh(), refreshDeck()]);
        setSelectedCard(null);
        toast.success(
          `Misión coagulada · +${data.result?.signalPreview ?? "?"} Señal (preview)`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo coagular.",
        );
      } finally {
        setCoagulating(false);
      }
    },
    [selectedCard, activeSlotDay, universeFetch, bumpTemporal, refresh, refreshDeck],
  );

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
    <div className="calendario-noir-root flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary/70">
                Simulador de turnos
              </p>
              <h1 className="text-lg font-semibold text-foreground">Calendario</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeSwitch mode={viewMode} onChange={setViewMode} skin="noir" />
            <Link
              href="/ludus/campamento"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
            >
              Campamento →
            </Link>
          </div>
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          1·2·3 vistas · Enter coagular · C confirmar rutina · S saltear · Shift+área filtrar
        </p>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
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
              selectedBlockId={selectedBlock?.id}
              onSelectBlock={setSelectedBlock}
              onRescheduleTask={handleRescheduleTask}
              onRescheduleEvent={handleRescheduleEvent}
              activeSlotDay={activeSlotDay}
              onSlotClick={(day) => {
                setActiveSlotDay(toIsoDayKey(day));
                if (selectedCard) void handleCoagulate(day);
              }}
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

        <SuggestionDeck
          cards={deckCards}
          isLoading={deckLoading || coagulating}
          selectedCardId={selectedCard?.id ?? null}
          areaFilter={areaFilter}
          onAreaFilterChange={setAreaFilter}
          onSelectCard={setSelectedCard}
          skin="noir"
        />
      </div>
    </div>
  );
}
