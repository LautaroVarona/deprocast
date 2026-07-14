"use client";

import { MiniCalendar } from "@/components/diario/mini-calendar";
import { DayNavigator } from "@/components/grid/day-navigator";
import type { DayOffset } from "@/lib/pendientes/types";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  AppleIcon,
  CalendarIcon,
  Loader2Icon,
  MoonIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  content: string;
  pillar: string;
  occurredAt: string;
  status: string;
  structuredData: Record<string, unknown>;
};

const HEALTH_PILLARS = new Set([
  "rendimiento",
  "combustible",
  "recuperacion",
  "estado_base",
]);

function dayOffsetToDate(offset: DayOffset): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (offset === "yesterday") date.setDate(date.getDate() - 1);
  if (offset === "tomorrow") date.setDate(date.getDate() + 1);
  return date;
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function resolveHealthLabel(event: CalendarEvent): string | null {
  if (!HEALTH_PILLARS.has(event.pillar)) return null;

  const metrics =
    event.structuredData?.metrics &&
    typeof event.structuredData.metrics === "object"
      ? (event.structuredData.metrics as Record<string, unknown>)
      : null;

  if (event.pillar === "combustible") {
    return metrics?.kind === "comida" ? "Ingesta" : "Combustible";
  }
  if (event.pillar === "rendimiento") {
    return "Actividad";
  }
  return "Salud";
}

function PillarBadge({ pillar }: { pillar: string }) {
  if (pillar === "combustible") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
        <AppleIcon className="size-3" />
        Combustible
      </span>
    );
  }
  if (pillar === "rendimiento") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
        <ActivityIcon className="size-3" />
        Rendimiento
      </span>
    );
  }
  if (pillar === "recuperacion") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300">
        <MoonIcon className="size-3" />
        Recuperación
      </span>
    );
  }
  if (pillar === "estado_base") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
        <ZapIcon className="size-3" />
        Estado base
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
      {pillar}
    </span>
  );
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
              <Link href="/salud" className="underline">
                Registrá en Salud
              </Link>{" "}
              o{" "}
              <Link href="/diario" className="underline">
                escribí en el diario
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2 overflow-y-auto">
              {events.map((event) => {
                const healthLabel = resolveHealthLabel(event);
                const isHealth = HEALTH_PILLARS.has(event.pillar);

                return (
                  <li
                    key={event.id}
                    className={cn(
                      "rounded-md border border-border bg-card px-3 py-2",
                      isHealth && "border-emerald-500/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <PillarBadge pillar={event.pillar} />
                          {healthLabel ? (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {healthLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm">{event.content}</p>
                        {isHealth ? (
                          <Link
                            href="/salud"
                            className="mt-1 inline-flex text-xs text-emerald-400/80 hover:text-emerald-300 hover:underline"
                          >
                            Ver en Salud →
                          </Link>
                        ) : (
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {event.status}
                          </p>
                        )}
                      </div>
                      <time className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatEventTime(event.occurredAt)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
