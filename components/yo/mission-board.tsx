"use client";

import { MissionNosceOverlay } from "@/components/yo/mission-nosce-overlay";
import { MissionPersonaOverlay } from "@/components/yo/mission-persona-overlay";
import { MissionProjectOverlay } from "@/components/yo/mission-project-overlay";
import type {
  ConsecrationMissionId,
  ConsecrationProgress,
  YoDto,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { CheckIcon, LockIcon } from "lucide-react";
import { useState } from "react";

const MISSION_COPY: Record<
  ConsecrationMissionId,
  { roman: string; title: string; subtitle: string; reward: string }
> = {
  nosce: {
    roman: "I",
    title: "Nosce Te Ipsum",
    subtitle: "Extraé los primeros datos de tu ADN personal.",
    reward: "Desbloquea telemetría de energía",
  },
  senado: {
    roman: "II",
    title: "El Senado",
    subtitle: "Registrá 3 entidades de tu círculo íntimo en el grafo.",
    reward: "Desbloquea el ritual de Nodos",
  },
  prima: {
    roman: "III",
    title: "Prima Materia",
    subtitle: "Inyectá tu primer gran objetivo a 90 días en el Atanor.",
    reward: "Libera navegación e Ingesta",
  },
};

type MissionBoardProps = {
  consecration: ConsecrationProgress;
  nosceOpen: boolean;
  onNosceOpenChange: (open: boolean) => void;
  onNosceCompleted: (yo: YoDto) => void;
  onProgress: () => Promise<void> | void;
};

export function MissionBoard({
  consecration,
  nosceOpen,
  onNosceOpenChange,
  onNosceCompleted,
  onProgress,
}: MissionBoardProps) {
  const [personaOpen, setPersonaOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const handleActivate = (id: ConsecrationMissionId) => {
    const mission = consecration.missions.find((item) => item.id === id);
    if (!mission || mission.status === "locked") return;

    if (id === "nosce" && mission.status !== "completed") {
      onNosceOpenChange(true);
      return;
    }
    if (id === "senado" && mission.status === "active") {
      setPersonaOpen(true);
      return;
    }
    if (id === "prima" && mission.status === "active") {
      setProjectOpen(true);
    }
  };

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto pb-4 md:grid-cols-3">
        {consecration.missions.map((mission) => {
          const copy = MISSION_COPY[mission.id];
          const locked = mission.status === "locked";
          const completed = mission.status === "completed";
          const isActive = mission.status === "active";

          return (
            <button
              key={mission.id}
              type="button"
              disabled={locked || completed}
              onClick={() => handleActivate(mission.id)}
              className={cn(
                "mission-column group relative flex min-h-[18rem] flex-col items-start gap-4 p-5 text-left transition md:min-h-0 md:p-6",
                locked && "pointer-events-none opacity-40",
                isActive && "mission-column--active",
                completed && "mission-column--done",
              )}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center border font-display text-base tracking-[0.12em]",
                    completed
                      ? "border-legion-gold/70 bg-legion-gold/15 text-legion-gold"
                      : isActive
                        ? "border-legion-bronze bg-legion-bronze/15 text-legion-bronze"
                        : "border-legion-patina text-legion-patina",
                  )}
                >
                  {completed ? (
                    <CheckIcon className="size-5" />
                  ) : locked ? (
                    <LockIcon className="size-4" />
                  ) : (
                    copy.roman
                  )}
                </span>

                {completed ? (
                  <span className="mission-seal font-mono text-[9px] tracking-[0.2em] text-legion-gold uppercase">
                    Sellada
                  </span>
                ) : isActive ? (
                  <span className="font-mono text-[9px] tracking-[0.18em] text-legion-bronze uppercase">
                    Activa
                  </span>
                ) : (
                  <span className="font-mono text-[9px] tracking-[0.18em] text-legion-patina uppercase">
                    Bloqueada
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <p
                  className={cn(
                    "font-display text-xl tracking-[0.04em] text-legion-bone md:text-2xl",
                    completed && "text-legion-gold",
                  )}
                >
                  Misión {copy.roman}: {copy.title}
                </p>
                <p className="font-mono text-[11px] leading-relaxed text-legion-bone/60">
                  {copy.subtitle}
                </p>
              </div>

              <div className="w-full space-y-2 border-t border-legion-bronze/20 pt-3 font-mono text-[10px] tracking-[0.14em] text-legion-bronze/80 uppercase">
                <p>
                  {mission.progress}/{mission.target}
                </p>
                <p className="normal-case tracking-normal text-legion-bone/45">
                  {copy.reward}
                </p>
                {isActive && !completed ? (
                  <p className="pt-1 text-legion-bronze group-hover:text-legion-gold">
                    Tocá para abrir →
                  </p>
                ) : null}
              </div>

              {completed ? (
                <span
                  aria-hidden
                  className="mission-seal-mark pointer-events-none absolute right-4 bottom-4 rotate-[-12deg] select-none font-display text-4xl text-legion-gold/25 md:text-5xl"
                >
                  Σ
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <MissionNosceOverlay
        open={nosceOpen}
        onOpenChange={onNosceOpenChange}
        onCompleted={onNosceCompleted}
      />

      <MissionPersonaOverlay
        open={personaOpen}
        onOpenChange={setPersonaOpen}
        progress={consecration.personaCount}
        target={
          consecration.missions.find((mission) => mission.id === "senado")
            ?.target ?? 3
        }
        onCreated={async () => {
          await onProgress();
        }}
      />

      <MissionProjectOverlay
        open={projectOpen}
        onOpenChange={setProjectOpen}
        onCreated={async () => {
          await onProgress();
        }}
      />
    </>
  );
}
