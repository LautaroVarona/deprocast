"use client";

import { EnergyBar } from "@/components/jornada/energy-bar";
import { EventTicker } from "@/components/jornada/event-ticker";
import {
  JornadaProvider,
  useJornada,
} from "@/components/jornada/jornada-context";
import { TaskBacklog } from "@/components/jornada/task-backlog";
import { Clock3Icon, OrbitIcon } from "lucide-react";

function JornadaPanels() {
  const { state, energyProgress, activeBloque } = useJornada();

  return (
    <div className="jornada-noir-root mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <OrbitIcon className="size-5 text-cyan-300/80" />
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
            Motor de Jornada
          </p>
        </div>
        <h1 className="bg-gradient-to-r from-white via-white/80 to-white/50 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
          Tiempo-Espacio × Partícula
        </h1>
        <p className="max-w-2xl text-sm text-white/50">
          Dos agentes acoplados: el listador temporal ejecuta el reloj vivo; el
          listador de tareas aplica la Ley del Mínimo Esfuerzo sobre tres
          prioridades doradas.
        </p>
      </header>

      <EnergyBar
        progress={energyProgress}
        currency={state.currency}
        activeBloque={activeBloque}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <EventTicker />
        <TaskBacklog />
      </div>

      <footer className="flex items-center gap-2 font-mono text-[10px] text-white/25">
        <Clock3Icon className="size-3" />
        <span>
          Estado compartido vía JornadaContext · reloj {activeBloque ?? "—"} ·{" "}
          {state.logs.length} entradas en diario
        </span>
      </footer>
    </div>
  );
}

export function JornadaWorkspace() {
  return (
    <JornadaProvider>
      <JornadaPanels />
    </JornadaProvider>
  );
}
