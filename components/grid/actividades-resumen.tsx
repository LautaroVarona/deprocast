"use client";

import type { DayOffset } from "@/lib/pendientes/types";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type CalendarEvent = {
  id: string;
  content: string;
  pillar: string;
  occurredAt: string;
};

type ActividadesResumenProps = {
  selectedDay: DayOffset;
};

export function ActividadesResumen({ selectedDay }: ActividadesResumenProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/calendario?day=${selectedDay}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      setEvents((data.events ?? []).slice(0, 2));
    } catch {
      setEvents([]);
    }
  }, [selectedDay]);

  useEffect(() => {
    void load();
  }, [load]);

  if (events.length === 0) return null;

  return (
    <section className="shrink-0 border-t border-white/10 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <CalendarIcon className="size-3.5 text-cyan-300/70" />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Actividades
        </p>
      </div>
      <ul className="space-y-1">
        {events.map((event) => (
          <li
            key={event.id}
            className={cn(
              "truncate rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-white/60",
            )}
          >
            {event.content}
          </li>
        ))}
      </ul>
    </section>
  );
}
