"use client";

import { PathTooltip } from "@/components/agentes/path-tooltip";
import type { OperationalAgent } from "@/lib/agentes/catalog";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

const BADGE_TONE: Record<OperationalAgent["badgeTone"], string> = {
  cyan: "border-primary/40 bg-primary/10 text-primary",
  emerald: "border-primary/40 bg-primary/10 text-primary",
  violet: "border-primary/40 bg-primary/10 text-primary",
  amber: "border-accent/40 bg-accent/10 text-accent",
  zinc: "border-border/40 bg-muted-foreground/10 text-foreground/80",
  rose: "border-destructive/40 bg-destructive/10 text-destructive",
};

type AgentRowProps = {
  agent: OperationalAgent;
  isActiveToday?: boolean;
};

export function AgentRow({ agent, isActiveToday }: AgentRowProps) {
  const functionsPreview = agent.functions.slice(0, 2).join(" · ");

  return (
    <tr className="border-b border-border transition hover:bg-muted/40">
      <td className="px-3 py-3">
        <span className="text-lg" aria-hidden>
          {agent.emoji}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {agent.locations[0]}
          </p>
        </div>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
            BADGE_TONE[agent.badgeTone],
          )}
        >
          {agent.badge}
        </span>
      </td>
      <td className="hidden px-3 py-3 lg:table-cell">
        <p className="line-clamp-2 text-xs text-muted-foreground">{functionsPreview}</p>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
            Operativo
          </span>
          {isActiveToday ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              Activo hoy
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {agent.locations[0] ? (
            <PathTooltip path={agent.locations[0]} className="max-w-[8rem]" />
          ) : null}
          {agent.uiRoute && !agent.uiRoute.includes("[") ? (
            <Link
              href={agent.uiRoute}
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary"
            >
              UI
              <ExternalLinkIcon className="size-3" />
            </Link>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
