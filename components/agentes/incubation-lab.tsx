"use client";

import { PathTooltip } from "@/components/agentes/path-tooltip";
import { Button } from "@/components/ui/button";
import type { DesignAgent } from "@/lib/agentes/catalog";
import { DESIGN_AGENTS } from "@/lib/agentes/catalog";
import { cn } from "@/lib/utils";
import { FlaskConicalIcon, GhostIcon } from "lucide-react";
import { useState } from "react";

function DesignAgentCard({
  agent,
  blueprintOpen,
}: {
  agent: DesignAgent;
  blueprintOpen: boolean;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border border-dashed border-zinc-700/60 bg-zinc-900/20 p-4",
        "opacity-75 saturate-[0.65] transition-all duration-300",
        blueprintOpen && "border-violet-500/30 bg-zinc-900/40 opacity-100 saturate-100",
      )}
    >
      <header className="mb-3 flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-600/60 bg-zinc-950/40 text-xl grayscale"
          aria-hidden
        >
          {agent.emoji}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-zinc-400">{agent.name}</h3>
          <p className="text-xs text-zinc-600">{agent.subtitle}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-600 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-zinc-500">
            <GhostIcon className="size-3" />
            Fase de diseño
          </span>
        </div>
      </header>

      {blueprintOpen ? (
        <div className="space-y-4 text-xs leading-relaxed animate-in fade-in duration-300">
          <p className="text-zinc-500">{agent.description}</p>

          <div>
            <p className="mb-2 font-medium uppercase tracking-wider text-zinc-600">
              Funciones previstas
            </p>
            <ul className="space-y-1.5 text-zinc-500">
              {agent.plannedFunctions.map((fn) => (
                <li key={fn} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full border border-dashed border-zinc-600" />
                  <span>{fn}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium uppercase tracking-wider text-zinc-600">
              Ubicación prevista
            </p>
            <PathTooltip path={agent.plannedLocation} mono={false} />
          </div>

          <div>
            <p className="mb-2 font-medium uppercase tracking-wider text-zinc-600">
              Tecnologías previstas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent.plannedTechnologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-dashed border-zinc-700/50 px-2 py-0.5 text-[0.65rem] text-zinc-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 line-clamp-3">{agent.description}</p>
      )}
    </article>
  );
}

export function IncubationLab() {
  const [blueprintOpen, setBlueprintOpen] = useState(false);

  return (
    <section
      className={cn(
        "rounded-2xl border border-dashed border-zinc-700/50 bg-gradient-to-b from-zinc-900/30 to-zinc-950/50 p-6",
        blueprintOpen && "border-violet-500/20",
      )}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <FlaskConicalIcon className="size-4 text-violet-400/70" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Laboratorio de incubación
            </h2>
          </div>
          <p className="max-w-xl text-xs text-zinc-600">
            Agentes en fase de diseño para potenciar el corpus unificado. Sin
            implementación en el repositorio — ver{" "}
            <code className="text-zinc-500">docs/agentes.md §6</code>.
          </p>
        </div>
        <Button
          type="button"
          variant={blueprintOpen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setBlueprintOpen((open) => !open)}
          className={cn(
            "shrink-0 border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800",
            blueprintOpen &&
              "border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20",
          )}
        >
          {blueprintOpen ? "Cerrar blueprint" : "Abrir blueprint de diseño"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DESIGN_AGENTS.map((agent) => (
          <DesignAgentCard
            key={agent.id}
            agent={agent}
            blueprintOpen={blueprintOpen}
          />
        ))}
      </div>
    </section>
  );
}
