"use client";

import { PathTooltip } from "@/components/agentes/path-tooltip";
import { Badge } from "@/components/ui/badge";
import type { OperationalAgent } from "@/lib/agentes/catalog";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

const BADGE_TONE: Record<OperationalAgent["badgeTone"], string> = {
  cyan: "border-primary/40 bg-primary/10 text-primary",
  emerald: "border-primary/40 bg-primary/10 text-primary",
  violet: "border-primary/40 bg-primary/10 text-primary",
  amber: "border-accent/40 bg-accent/10 text-accent",
  zinc: "border-border/40 bg-muted-foreground/10 text-foreground/80",
  rose: "border-destructive/40 bg-destructive/10 text-destructive",
};

type AgentCardProps = {
  agent: OperationalAgent;
  isActiveToday?: boolean;
};

export function AgentCard({ agent, isActiveToday }: AgentCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border border-border bg-muted/40 p-4 shadow-lg shadow-foreground/10",
        "transition-all duration-200 hover:border-primary/30 hover:shadow-primary/5",
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xl"
            aria-hidden
          >
            {agent.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {agent.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-primary">
                <span className="size-1.5 rounded-full bg-primary/20 shadow-[0_0_6px_color-mix(in_oklch,var(--primary)_70%,transparent)]" />
                Operativo
              </span>
              {isActiveToday ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-primary">
                  Activo hoy
                </span>
              ) : null}
              {agent.uiRoute && !agent.uiRoute.includes("[") ? (
                <Link
                  href={agent.uiRoute}
                  className="inline-flex items-center gap-0.5 text-[0.65rem] text-primary hover:text-primary"
                >
                  UI
                  <ExternalLinkIcon className="size-3" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 border text-[0.65rem] font-medium",
            BADGE_TONE[agent.badgeTone],
          )}
        >
          {agent.badge}
        </Badge>
      </header>

      <div className="mb-3 space-y-1.5">
        <p className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
          Ubicación
        </p>
        <div className="space-y-1">
          {agent.locations.slice(0, 2).map((location) => (
            <PathTooltip key={location} path={location} />
          ))}
          {agent.locations.length > 2 ? (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer list-none hover:text-primary">
                +{agent.locations.length - 2} rutas más
              </summary>
              <div className="mt-1.5 space-y-1">
                {agent.locations.slice(2).map((location) => (
                  <PathTooltip key={location} path={location} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>

      <details className="group/details mb-3 border-t border-border pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-foreground/80 hover:text-primary [&::-webkit-details-marker]:hidden">
          Funciones clave
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open/details:rotate-180" />
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          {agent.functions.map((fn) => (
            <li key={fn} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" />
              <span>{fn}</span>
            </li>
          ))}
        </ul>
      </details>

      <footer className="mt-auto border-t border-border pt-3">
        <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
          Tecnologías
        </p>
        <div className="flex flex-wrap gap-1.5">
          {agent.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-[0.65rem] text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </footer>
    </article>
  );
}
