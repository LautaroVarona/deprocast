"use client";

import type { ActivityEntry } from "@/lib/historial/types";
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
} from "@/lib/historial/types";
import { cn } from "@/lib/utils";
import {
  BotIcon,
  ChevronDownIcon,
  CpuIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  CATEGORY_ICONS,
  formatTime,
  resolveSourceLink,
} from "@/components/historial/historial-utils";

type ActivityEntryRowProps = {
  entry: ActivityEntry;
  compact?: boolean;
};

export function ActivityEntryRow({ entry, compact = false }: ActivityEntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceLink = resolveSourceLink(entry);
  const stageAgents = Array.isArray(entry.metadata.stageAgents)
    ? (entry.metadata.stageAgents as Array<{
        station: number;
        name: string;
        agentName: string;
      }>)
    : [];
  const pipelineStages = Array.isArray(entry.metadata.stages)
    ? (entry.metadata.stages as Array<{
        station?: number;
        name?: string;
        agentId?: string;
        model?: string;
      }>)
    : [];
  const healthMetrics =
    entry.category === "salud" &&
    entry.metadata.metrics &&
    typeof entry.metadata.metrics === "object"
      ? (entry.metadata.metrics as Record<string, unknown>)
      : null;
  const macroTotals =
    healthMetrics?.totals && typeof healthMetrics.totals === "object"
      ? (healthMetrics.totals as {
          calories?: number;
          proteinG?: number;
          carbsG?: number;
          fatG?: number;
        })
      : null;

  const showExpanded = !compact || expanded;

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-muted/40 transition hover:border-primary/20",
        compact && "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left sm:p-4"
      >
        <span className="mt-0.5 text-lg" aria-hidden>
          {CATEGORY_ICONS[entry.category] ?? "📋"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <time className="font-mono text-[10px] text-muted-foreground">
              {formatTime(entry.occurredAt)}
            </time>
            <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[entry.category] ?? entry.category}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
          </div>

          <h3 className="mt-1 text-sm font-medium text-foreground">{entry.title}</h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.agentName ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                <BotIcon className="size-3" />
                {entry.agentName}
              </span>
            ) : null}
            {entry.modelUsed ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                <CpuIcon className="size-3" />
                {entry.modelUsed}
              </span>
            ) : null}
          </div>
        </div>

        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition",
            expanded && "rotate-180",
          )}
        />
      </button>

      {showExpanded && expanded ? (
        <div className="border-t border-border px-4 pb-4 pt-3 text-xs text-muted-foreground">
          {entry.summary ? (
            <p className="mb-3 leading-relaxed text-muted-foreground">{entry.summary}</p>
          ) : null}

          {macroTotals ? (
            <div className="mb-3 flex flex-wrap gap-2 font-mono text-[10px] text-primary/90">
              {typeof macroTotals.calories === "number" ? (
                <span>{Math.round(macroTotals.calories)} kcal</span>
              ) : null}
              {typeof macroTotals.proteinG === "number" ? (
                <span>P {Math.round(macroTotals.proteinG)}g</span>
              ) : null}
              {typeof macroTotals.carbsG === "number" ? (
                <span>C {Math.round(macroTotals.carbsG)}g</span>
              ) : null}
              {typeof macroTotals.fatG === "number" ? (
                <span>G {Math.round(macroTotals.fatG)}g</span>
              ) : null}
            </div>
          ) : null}

          {stageAgents.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Agentes por estación
              </p>
              <ul className="space-y-1">
                {stageAgents.map((stage) => (
                  <li key={`${stage.station}-${stage.name}`} className="text-muted-foreground">
                    Est. {stage.station} · {stage.name} →{" "}
                    <span className="text-primary/90">{stage.agentName}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pipelineStages.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Pipeline (estaciones)
              </p>
              <ul className="space-y-1">
                {pipelineStages.map((stage) => (
                  <li
                    key={`${stage.station}-${stage.name}-${stage.agentId}`}
                    className="text-muted-foreground"
                  >
                    Est. {stage.station ?? "?"} · {stage.name ?? "—"}
                    {stage.agentId ? (
                      <>
                        {" "}
                        → <span className="text-primary/90">{stage.agentId}</span>
                      </>
                    ) : null}
                    {stage.model ? (
                      <span className="text-primary/80"> · {stage.model}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <dl className="grid gap-1 font-mono text-[10px] text-muted-foreground sm:grid-cols-2">
            {entry.sourceType ? (
              <>
                <dt>Fuente</dt>
                <dd>{entry.sourceType}</dd>
              </>
            ) : null}
            {entry.sourceRef ? (
              <>
                <dt>Ref</dt>
                <dd className="truncate">{entry.sourceRef}</dd>
              </>
            ) : null}
            {entry.correlationId ? (
              <>
                <dt>Correlación</dt>
                <dd className="truncate">{entry.correlationId}</dd>
              </>
            ) : null}
          </dl>

          {sourceLink ? (
            <Link
              href={sourceLink}
              className="mt-3 inline-flex text-primary hover:text-primary hover:underline"
            >
              Ver en la plataforma →
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
