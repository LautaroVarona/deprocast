"use client";

import { PathTooltip } from "@/components/agentes/path-tooltip";
import { Badge } from "@/components/ui/badge";
import type { OperationalAgent } from "@/lib/agentes/catalog";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

const BADGE_TONE: Record<OperationalAgent["badgeTone"], string> = {
  cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  zinc: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

type AgentCardProps = {
  agent: OperationalAgent;
};

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-lg shadow-black/20",
        "transition-all duration-200 hover:border-cyan-500/30 hover:shadow-cyan-500/5",
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-950 text-xl"
            aria-hidden
          >
            {agent.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight text-zinc-50">
              {agent.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" />
                Operativo
              </span>
              {agent.uiRoute && !agent.uiRoute.includes("[") ? (
                <Link
                  href={agent.uiRoute}
                  className="inline-flex items-center gap-0.5 text-[0.65rem] text-cyan-400/80 hover:text-cyan-300"
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
        <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">
          Ubicación
        </p>
        <div className="space-y-1">
          {agent.locations.slice(0, 2).map((location) => (
            <PathTooltip key={location} path={location} />
          ))}
          {agent.locations.length > 2 ? (
            <details className="text-xs text-zinc-500">
              <summary className="cursor-pointer list-none hover:text-cyan-400/80">
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

      <details className="group/details mb-3 border-t border-zinc-800/80 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-zinc-300 hover:text-cyan-300 [&::-webkit-details-marker]:hidden">
          Funciones clave
          <ChevronDownIcon className="size-4 text-zinc-500 transition-transform group-open/details:rotate-180" />
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-400">
          {agent.functions.map((fn) => (
            <li key={fn} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-500/60" />
              <span>{fn}</span>
            </li>
          ))}
        </ul>
      </details>

      <footer className="mt-auto border-t border-zinc-800/80 pt-3">
        <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">
          Tecnologías
        </p>
        <div className="flex flex-wrap gap-1.5">
          {agent.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-zinc-700/50 bg-zinc-950/60 px-2 py-0.5 text-[0.65rem] text-zinc-400"
            >
              {tech}
            </span>
          ))}
        </div>
      </footer>
    </article>
  );
}
