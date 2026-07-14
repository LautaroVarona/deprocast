"use client";

import { PathTooltip } from "@/components/agentes/path-tooltip";
import type { OperationalAgent } from "@/lib/agentes/catalog";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

const BADGE_TONE: Record<OperationalAgent["badgeTone"], string> = {
  cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  zinc: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

type AgentRowProps = {
  agent: OperationalAgent;
  isActiveToday?: boolean;
};

export function AgentRow({ agent, isActiveToday }: AgentRowProps) {
  const functionsPreview = agent.functions.slice(0, 2).join(" · ");

  return (
    <tr className="border-b border-zinc-800/60 transition hover:bg-zinc-900/40">
      <td className="px-3 py-3">
        <span className="text-lg" aria-hidden>
          {agent.emoji}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{agent.name}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-600">
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
        <p className="line-clamp-2 text-xs text-zinc-500">{functionsPreview}</p>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
            Operativo
          </span>
          {isActiveToday ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
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
              className="inline-flex items-center gap-1 text-[10px] text-cyan-400/80 hover:text-cyan-300"
            >
              UI
              <ExternalLinkIcon className="size-3" />
            </Link>
          ) : (
            <span className="text-[10px] text-zinc-700">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
