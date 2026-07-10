"use client";

import { MiniCalendar } from "@/components/diario/mini-calendar";
import { DayNavigator } from "@/components/grid/day-navigator";
import type { DayOffset } from "@/lib/pendientes/types";
import { CalendarIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  content: string;
  pillar: string;
  occurredAt: string;
  status: string;
};

function dayOffsetToDate(offset: DayOffset): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (offset === "yesterday") date.setDate(date.getDate() - 1);
  if (offset === "tomorrow") date.setDate(date.getDate() + 1);
  return date;
}

export function CalendarioWorkspace() {
  const [selectedDay, setSelectedDay] = useState<DayOffset>("today");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarDay, setCalendarDay] = useState<number | null>(
    () => new Date().getDate(),
  );

  const selectedDate = useMemo(
    () => dayOffsetToDate(selectedDay),
    [selectedDay],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendario?day=${selectedDay}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Error al cargar.");
      const data = await response.json();
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    void load();
    setYear(selectedDate.getFullYear());
    setMonth(selectedDate.getMonth() + 1);
    setCalendarDay(selectedDate.getDate());
  }, [load, selectedDate]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-5 text-cyan-500/80" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Tiempo
            </p>
            <h1 className="text-lg font-semibold">Calendario</h1>
          </div>
        </div>
      </header>

      <DayNavigator selectedDay={selectedDay} onDayChange={setSelectedDay} />

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 overflow-hidden p-4 md:grid-cols-2 md:grid-rows-1">
        <MiniCalendar
          year={year}
          month={month}
          selectedDay={calendarDay}
          daysWithEntries={calendarDay ? [calendarDay] : []}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          onDaySelect={setCalendarDay}
        />

        <section className="min-h-0 overflow-hidden rounded-lg border border-border bg-muted/10 p-3">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Eventos del día
          </h2>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Cargando…
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin eventos registrados.{" "}
              <Link href="/diario" className="underline">
                Escribí en el diario
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2 overflow-y-auto">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-md border border-border bg-card px-3 py-2"
                >
                  <p className="text-sm">{event.content}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {event.pillar} · {event.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
