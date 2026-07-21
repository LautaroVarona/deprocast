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
        "flex h-full flex-col rounded-xl border border-dashed border-border/60 bg-muted/40 p-4",
        "opacity-75 saturate-[0.65] transition-all duration-300",
        blueprintOpen && "border-primary/30 bg-muted/40 opacity-100 saturate-100",
      )}
    >
      <header className="mb-3 flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/40 text-xl grayscale"
          aria-hidden
        >
          {agent.emoji}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">{agent.name}</h3>
          <p className="text-xs text-muted-foreground">{agent.subtitle}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            <GhostIcon className="size-3" />
            Fase de diseño
          </span>
        </div>
      </header>

      {blueprintOpen ? (
        <div className="space-y-4 text-xs leading-relaxed animate-in fade-in duration-300">
          <p className="text-muted-foreground">{agent.description}</p>

          <div>
            <p className="mb-2 font-medium uppercase tracking-wider text-muted-foreground">
              Funciones previstas
            </p>
            <ul className="space-y-1.5 text-muted-foreground">
              {agent.plannedFunctions.map((fn) => (
                <li key={fn} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full border border-dashed border-border" />
                  <span>{fn}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-medium uppercase tracking-wider text-muted-foreground">
              Ubicación prevista
            </p>
            <PathTooltip path={agent.plannedLocation} mono={false} />
          </div>

          <div>
            <p className="mb-2 font-medium uppercase tracking-wider text-muted-foreground">
              Tecnologías previstas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent.plannedTechnologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-dashed border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground line-clamp-3">{agent.description}</p>
      )}
    </article>
  );
}

export function IncubationLab() {
  const [blueprintOpen, setBlueprintOpen] = useState(false);

  return (
    <section
      className={cn(
        "rounded-2xl border border-dashed border-border bg-gradient-to-b from-background/30 to-background/50 p-6",
        blueprintOpen && "border-primary/20",
      )}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <FlaskConicalIcon className="size-4 text-primary/70" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Laboratorio de incubación
            </h2>
          </div>
          <p className="max-w-xl text-xs text-muted-foreground">
            Agentes en fase de diseño para potenciar el corpus unificado. Sin
            implementación en el repositorio — ver{" "}
            <code className="text-muted-foreground">docs/agentes.md §6</code>.
          </p>
        </div>
        <Button
          type="button"
          variant={blueprintOpen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setBlueprintOpen((open) => !open)}
          className={cn(
            "shrink-0 border-border bg-card/80 text-foreground/80 hover:bg-muted",
            blueprintOpen &&
              "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
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
