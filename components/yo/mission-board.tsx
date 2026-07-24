"use client";

import { MissionPersonaOverlay } from "@/components/yo/mission-persona-overlay";
import { MissionProjectOverlay } from "@/components/yo/mission-project-overlay";
import type {
  ConsecrationMissionId,
  ConsecrationProgress,
  YoDto,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { CheckIcon, LockIcon, ScrollTextIcon } from "lucide-react";
import { useMemo, useState } from "react";

const MISSION_COPY: Record<
  ConsecrationMissionId,
  { roman: string; title: string; subtitle: string; reward: string }
> = {
  nosce: {
    roman: "I",
    title: "Nosce Te Ipsum",
    subtitle: "Extraé los primeros datos de tu ADN personal en el Conducto.",
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
  yo: YoDto;
  consecration: ConsecrationProgress;
  onFocusConduit: () => void;
  onProgress: () => Promise<void> | void;
};

export function MissionBoard({
  yo,
  consecration,
  onFocusConduit,
  onProgress,
}: MissionBoardProps) {
  const [personaOpen, setPersonaOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const active = consecration.activeMissionId;

  const sealLabel = useMemo(() => {
    const done = consecration.missions.filter(
      (mission) => mission.status === "completed",
    ).length;
    return `${done}/3 sellos`;
  }, [consecration.missions]);

  const handleActivate = (id: ConsecrationMissionId) => {
    const mission = consecration.missions.find((item) => item.id === id);
    if (!mission || mission.status === "locked") return;

    if (id === "nosce") {
      onFocusConduit();
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
      <section className="mission-tabula space-y-5 p-5 md:p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.32em] text-legion-bronze uppercase">
              Tabula · Misiones de Consagración
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-[0.06em] text-legion-bone">
              Protocolo Génesis
            </h2>
            <p className="mt-1 max-w-md font-mono text-[11px] leading-relaxed text-legion-bone/65">
              {yo.exocortexName} no libera el exoesqueleto hasta que completes
              los tres actos. El Sancta Sanctorum exige prueba.
            </p>
          </div>
          <div className="border border-legion-bronze/40 bg-black/30 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-legion-bronze uppercase">
            {sealLabel}
          </div>
        </header>

        <ol className="space-y-3">
          {consecration.missions.map((mission) => {
            const copy = MISSION_COPY[mission.id];
            const locked = mission.status === "locked";
            const completed = mission.status === "completed";
            const isActive = mission.status === "active";

            return (
              <li key={mission.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => handleActivate(mission.id)}
                  className={cn(
                    "mission-tabula-row group flex w-full items-start gap-4 px-4 py-4 text-left transition",
                    locked && "cursor-not-allowed opacity-45",
                    isActive && "mission-tabula-row--active",
                    completed && "mission-tabula-row--done",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center border font-display text-sm tracking-[0.12em]",
                      completed
                        ? "border-legion-gold/70 bg-legion-gold/15 text-legion-gold"
                        : isActive
                          ? "border-legion-bronze bg-legion-bronze/15 text-legion-bronze"
                          : "border-legion-patina text-legion-patina",
                    )}
                  >
                    {completed ? (
                      <CheckIcon className="size-4" />
                    ) : locked ? (
                      <LockIcon className="size-3.5" />
                    ) : (
                      copy.roman
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "font-display text-base tracking-[0.04em] text-legion-bone",
                          completed && "line-through decoration-legion-gold/70",
                        )}
                      >
                        Misión {copy.roman}: {copy.title}
                      </p>
                      {isActive ? (
                        <span className="font-mono text-[9px] tracking-[0.18em] text-legion-bronze uppercase">
                          [ ACTIVA ]
                        </span>
                      ) : null}
                      {completed ? (
                        <span className="font-mono text-[9px] tracking-[0.18em] text-legion-gold uppercase">
                          [ SELLADA ]
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-legion-bone/60">
                      {copy.subtitle}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-legion-bronze/80 uppercase">
                      <span>
                        {mission.progress}/{mission.target}
                      </span>
                      <span className="text-legion-bone/35">·</span>
                      <span className="normal-case tracking-normal text-legion-bone/50">
                        {copy.reward}
                      </span>
                    </div>
                  </div>

                  {!locked ? (
                    <ScrollTextIcon
                      className={cn(
                        "mt-1 size-4 shrink-0 text-legion-bronze/50 transition group-hover:text-legion-bronze",
                        completed && "text-legion-gold/60",
                      )}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        {active === "nosce" ? (
          <p className="border border-legion-bronze/25 bg-black/25 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-legion-bone/70">
            Respondé las tres preguntas en el Conducto. Cada respuesta sella una
            faceta de tu ADN.
          </p>
        ) : null}
        {active === "senado" ? (
          <p className="border border-legion-bronze/25 bg-black/25 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-legion-bone/70">
            Tocá la Misión II para abrir el registro real de personas — el
            mismo gesto que usarás en Nodos.
          </p>
        ) : null}
        {active === "prima" ? (
          <p className="border border-legion-bronze/25 bg-black/25 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-legion-bone/70">
            Tocá Prima Materia para inyectar fuego en el Atanor. Al sellar,
            la Legión te abre las puertas.
          </p>
        ) : null}
      </section>

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
