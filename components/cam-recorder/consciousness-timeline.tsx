"use client";

import { useCamRecorder } from "@/components/cam-recorder/cam-recorder-context";
import type { ConsciousnessNote } from "@/lib/cam-recorder-watcher/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

function FocusBar({ nivel }: { nivel: number }) {
  return (
    <div className="flex items-center gap-1.5" title={`Foco ${nivel}/12`}>
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1 w-1 rounded-full",
            index < nivel ? "bg-emerald-400/80" : "bg-white/10",
          )}
        />
      ))}
    </div>
  );
}

function LogEntry({
  note,
  isActive,
  isLatest,
  onSelect,
}: {
  note: ConsciousnessNote;
  isActive: boolean;
  isLatest: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "cam-recorder-log-entry w-full text-left transition-all duration-300",
        isActive && "cam-recorder-log-entry--active",
        isLatest && "cam-recorder-log-entry--streaming",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="cam-recorder-timestamp font-mono text-xs tabular-nums">
          [{note.timestamp}]
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
          {note.appActiva}
        </span>
        <FocusBar nivel={note.nivelDeFoco} />
      </div>
      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/55">
        <span className="text-white/25">— </span>
        {note.descripcionDetallada}
      </p>
    </button>
  );
}

export function ConsciousnessTimeline() {
  const {
    phase,
    notas,
    activeNoteId,
    seekToNote,
    isBusy,
  } = useCamRecorder();
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestId = notas.at(-1)?.id;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || notas.length === 0) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [notas.length, latestId]);

  return (
    <div className="cam-recorder-noir-panel flex h-full min-h-[420px] flex-col">
      <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
            Línea de Tiempo
          </p>
          <h2 className="font-mono text-sm text-white/80">
            Logs de Conciencia
          </h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-white/30">
            {notas.length} nota{notas.length === 1 ? "" : "s"}
          </p>
          {phase === "analyzing" ? (
            <p className="cam-recorder-status-live font-mono text-[10px] text-emerald-400/90">
              ● procesando
            </p>
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="cam-recorder-timeline-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3"
      >
        {notas.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 px-4 text-center">
            {isBusy ? (
              <>
                <span className="cam-recorder-scanline h-px w-24 bg-emerald-500/40" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/70">
                  El watcher está indexando el plano visual…
                </p>
              </>
            ) : (
              <p className="font-mono text-[10px] text-white/25">
                Las notas cronológicas aparecerán aquí durante el análisis.
              </p>
            )}
          </div>
        ) : (
          notas.map((note) => (
            <LogEntry
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              isLatest={note.id === latestId && phase === "analyzing"}
              onSelect={() => seekToNote(note)}
            />
          ))
        )}
      </div>
    </div>
  );
}
