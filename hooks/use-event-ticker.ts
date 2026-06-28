"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BLOQUE_CONSOLE_HINTS,
  INACTIVITY_THRESHOLD_MS,
  TICKER_TICK_MS,
} from "@/lib/jornada/constants";
import type {
  ScheduledEvent,
  TickerSnapshot,
  TickerStatus,
} from "@/lib/jornada/types";
import {
  findActiveEvent,
  findNextEvent,
  formatClock,
  formatMinutesRemaining,
  getBlockProgress,
  getNowMinutes,
} from "@/lib/jornada/utils";

type UseEventTickerOptions = {
  events: ScheduledEvent[];
  closedEventIds: string[];
  mateBreakUntil: number | null;
  lastInteractionAt: number;
  onTick?: (now: Date) => void;
};

function buildConsoleLine(
  status: TickerStatus,
  activeEvent: ScheduledEvent | null,
  nextEvent: ScheduledEvent | null,
  mateBreakUntil: number | null,
  now: Date,
): string {
  const clock = formatClock(now);

  switch (status) {
    case "mate":
      return `[Mate] Pausa activa · ${formatMinutesRemaining(mateBreakUntil ?? now.getTime(), now.getTime())} restantes · ${clock}`;
    case "bloque_cerrado":
      return `[Cerrado] Bloque finalizado anticipadamente. Recalibrando pipeline · ${clock}`;
    case "ejecutando":
      if (!activeEvent) return `[Ejecutando] Sincronizando reloj interno · ${clock}`;
      return `[Ejecutando] Foco en ${activeEvent.bloquePrioridad}. ${BLOQUE_CONSOLE_HINTS[activeEvent.bloquePrioridad]}`;
    case "desvio":
      return `[Desvío] Fuera de bloque programado. ${nextEvent ? `Próximo: ${nextEvent.titulo} (${nextEvent.horaInicio})` : "Sin más bloques hoy."} · ${clock}`;
    case "inactivo":
      return `[Inactivo] Sin señal de usuario. El tiempo-espacio espera input · ${clock}`;
    case "esperando":
    default:
      if (nextEvent) {
        return `[Standby] Próximo bloque: ${nextEvent.bloquePrioridad} @ ${nextEvent.horaInicio} · ${clock}`;
      }
      return `[Standby] Jornada cerrada. Modo observador · ${clock}`;
  }
}

export function useEventTicker({
  events,
  closedEventIds,
  mateBreakUntil,
  lastInteractionAt,
  onTick,
}: UseEventTickerOptions): TickerSnapshot {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = new Date();
      setNow(current);
      onTick?.(current);
    }, TICKER_TICK_MS);

    return () => window.clearInterval(interval);
  }, [onTick]);

  return useMemo(() => {
    const nowMinutes = getNowMinutes(now);
    const activeEvent = findActiveEvent(events, nowMinutes, closedEventIds);
    const nextEvent = findNextEvent(events, nowMinutes, closedEventIds);
    const isOnMate = mateBreakUntil !== null && now.getTime() < mateBreakUntil;
    const isInactive = now.getTime() - lastInteractionAt > INACTIVITY_THRESHOLD_MS;

    let status: TickerStatus = "esperando";

    if (isOnMate) {
      status = "mate";
    } else if (activeEvent) {
      status = isInactive ? "inactivo" : "ejecutando";
    } else if (nextEvent) {
      status = "desvio";
    }

    const showQuickActions =
      status === "inactivo" || status === "desvio" || status === "ejecutando";

    const progressInBlock = activeEvent
      ? getBlockProgress(activeEvent, nowMinutes)
      : 0;

    const consoleLine = buildConsoleLine(
      status,
      activeEvent,
      nextEvent,
      mateBreakUntil,
      now,
    );

    return {
      status,
      activeEvent,
      consoleLine,
      showQuickActions,
      progressInBlock,
      nextEvent,
      now,
    };
  }, [events, closedEventIds, mateBreakUntil, lastInteractionAt, now]);
}
