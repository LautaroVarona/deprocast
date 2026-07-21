"use client";

import { AssaultOverlay } from "@/components/ludus/trinchera/assault-overlay";
import { useTrincheraSession } from "@/components/ludus/trinchera/trinchera-session-context";
import type { TrincheraSnapshot } from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import { HistoryIcon, NotebookPenIcon } from "lucide-react";
import { useState } from "react";

type TrincheraSidePanelProps = {
  snapshot: TrincheraSnapshot;
};

type PanelTab = "notas" | "historial";

const MODE_LABELS = {
  isochronic: "Isocrónico",
  binaural: "Binaural",
  meditative: "Meditativo",
} as const;

export function TrincheraSidePanel({ snapshot }: TrincheraSidePanelProps) {
  const [panelTab, setPanelTab] = useState<PanelTab>("notas");
  const {
    assaultNotes,
    setAssaultNotes,
    activeAssault,
    remainingSec,
    isPlaying,
    isCompleting,
    tabVisible,
    params,
    finishSession,
  } = useTrincheraSession();

  const assaultProgress = activeAssault
    ? 1 - remainingSec / (activeAssault.durationMin * 60)
    : 0;

  return (
    <>
      {activeAssault ? (
        <AssaultOverlay
          title={activeAssault.title}
          remainingSec={remainingSec}
          progress={assaultProgress}
          isPlaying={isPlaying}
          tabVisible={tabVisible}
          isCompleting={isCompleting}
          modeLabel={MODE_LABELS[params.mode]}
          onAbort={() => void finishSession(false)}
          onComplete={() => void finishSession(true)}
        />
      ) : null}

      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <div className="shrink-0 border-b border-border p-3">
          <div className="flex rounded-lg border border-border bg-card/80 p-1">
            <button
              type="button"
              onClick={() => setPanelTab("notas")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
                panelTab === "notas"
                  ? "bg-foreground/12 text-foreground"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              <NotebookPenIcon className="size-3.5" />
              Notas
            </button>
            <button
              type="button"
              onClick={() => setPanelTab("historial")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
                panelTab === "historial"
                  ? "bg-foreground/12 text-foreground"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              <HistoryIcon className="size-3.5" />
              Historial
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          {panelTab === "notas" ? (
            <section className="flex min-h-0 flex-1 flex-col gap-2">
              <p className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Bloc de notas
              </p>
              <p className="shrink-0 text-[11px] leading-relaxed text-muted-foreground">
                Volcá ideas, contexto y dumping durante el asalto. Se guarda
                localmente en este navegador.
              </p>
              <textarea
                value={assaultNotes}
                onChange={(e) => setAssaultNotes(e.target.value)}
                placeholder="Escribí libremente..."
                className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-background/45 px-3 py-3 font-mono text-[12px] leading-relaxed text-muted-foreground placeholder:text-muted-foreground focus:border-border focus:outline-none"
              />
            </section>
          ) : (
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <p className="mb-2 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Asaltos recientes
              </p>

              {snapshot.recentAssaults.length > 0 ? (
                <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                  {snapshot.recentAssaults.map((assault) => (
                    <li
                      key={assault.id}
                      className="rounded-lg border border-border bg-background/35 px-3 py-2.5"
                    >
                      <p className="line-clamp-2 text-xs font-medium leading-snug text-muted-foreground">
                        {assault.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {assault.completed
                          ? `+${assault.signalPoints} PS`
                          : "abortado"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-1 items-center justify-center px-4 text-center">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Sin asaltos registrados aún.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
