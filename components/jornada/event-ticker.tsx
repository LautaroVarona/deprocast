"use client";

import { useJornada } from "@/components/jornada/jornada-context";
import { Button } from "@/components/ui/button";
import {
  BLOQUE_COLORS,
  BLOQUE_GLOW,
} from "@/lib/jornada/constants";
import { cn } from "@/lib/utils";
import { CoffeeIcon, SquareIcon, TerminalIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export function EventTicker() {
  const { state, ticker, startMateBreak, closeActiveBlock, touch } = useJornada();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [state.logs.length, ticker.consoleLine]);

  const activeBloque = ticker.activeEvent?.bloquePrioridad;

  return (
    <section
      className="jornada-noir-panel relative overflow-hidden"
      aria-label="Ticker de eventos activos"
      onMouseMove={touch}
      onFocus={touch}
    >
      <div className="jornada-scanlines pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="jornada-noir-glow pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-4 text-primary/80" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              El Tiempo-Espacio
            </p>
            <h2 className="text-sm font-medium text-foreground">
              Ticker de Eventos Activos
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "jornada-pulse-dot size-2 rounded-full",
              ticker.status === "ejecutando" && "bg-primary/20",
              ticker.status === "mate" && "bg-accent/20",
              ticker.status === "inactivo" && "bg-accent/20",
              ticker.status === "desvio" && "bg-destructive/20",
              (ticker.status === "esperando" || ticker.status === "bloque_cerrado") &&
                "bg-muted/40",
            )}
          />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {ticker.now.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
      </header>

      <div className="relative space-y-4 p-4">
        <div
          className={cn(
            "jornada-console relative overflow-hidden rounded-lg border border-border bg-card/80 px-4 py-3 font-mono text-sm",
            activeBloque && `shadow-lg ${BLOQUE_GLOW[activeBloque]}`,
          )}
        >
          <div className="jornada-ticker-track flex whitespace-nowrap">
            <p
              className={cn(
                "jornada-ticker-text inline-flex items-center gap-2",
                activeBloque ? BLOQUE_COLORS[activeBloque] : "text-muted-foreground",
              )}
            >
              <span className="text-muted-foreground">›</span>
              {ticker.consoleLine}
              <span className="jornada-cursor ml-1 inline-block h-4 w-2 bg-primary/90" />
            </p>
          </div>

          {ticker.activeEvent && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{ticker.activeEvent.titulo}</span>
                <span>
                  {ticker.activeEvent.horaInicio}–{ticker.activeEvent.horaFin}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r from-primary/60 to-foreground/80 transition-[width] duration-1000 ease-linear",
                  )}
                  style={{ width: `${ticker.progressInBlock * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {ticker.showQuickActions && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-accent/30 bg-accent/10 font-mono text-xs text-accent hover:bg-accent/20"
              onClick={() => {
                touch();
                startMateBreak();
              }}
            >
              <CoffeeIcon className="size-3.5" />
              [Mate de 5 min]
            </Button>
            {ticker.activeEvent && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-destructive/30 bg-destructive/10 font-mono text-xs text-destructive hover:bg-destructive/20"
                onClick={() => {
                  touch();
                  closeActiveBlock(ticker.activeEvent!.id);
                }}
              >
                <SquareIcon className="size-3.5" />
                [Cerrar Bloque]
              </Button>
            )}
          </div>
        )}

        <div
          ref={logRef}
          className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
        >
          {state.logs.slice(0, 12).map((log) => (
            <p
              key={log.id}
              className={cn(
                "jornada-log-line animate-in fade-in slide-in-from-left-2 duration-500",
                log.kind === "accion" && "text-primary/80",
                log.kind === "tiempo" && "text-accent",
                log.kind === "sistema" && "text-muted-foreground",
              )}
            >
              {log.message}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
