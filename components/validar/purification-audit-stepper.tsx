"use client";

import {
  computeLineDiff,
  formatJsonOutput,
  formatStageMeta,
  getStageStatus,
  hasDudaMarkers,
  isJsonStage,
  resolveStageInput,
  sortStagesForDisplay,
  type DiffLine,
  type StageStatus,
} from "@/lib/purifier/stage-diff";
import type { PurifierStageSnapshot } from "@/lib/purifier/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  XCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type PurificationAuditStepperProps = {
  snapshots: PurifierStageSnapshot[];
  originalText: string;
  defaultExpanded?: boolean;
};

const STATUS_LABELS: Record<StageStatus, string> = {
  pending: "Pendiente",
  completed: "Completado",
  failed: "Fallido",
};

function formatStationNumber(station: number): string {
  if (station === 41) return "KG";
  return String(station).padStart(2, "0");
}

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === "failed") {
    return <XCircleIcon className="size-3.5 shrink-0 text-destructive" />;
  }
  if (status === "completed") {
    return <CheckCircle2Icon className="size-3.5 shrink-0 text-primary/80" />;
  }
  return <CircleDashedIcon className="size-3.5 shrink-0 text-muted-foreground" />;
}

function StageDiffPanel({
  snapshot,
  input,
}: {
  snapshot: PurifierStageSnapshot;
  input: string;
}) {
  const jsonStage = isJsonStage(snapshot.station);

  const { lines, truncated } = useMemo(
    () => computeLineDiff(input, snapshot.output),
    [input, snapshot.output],
  );

  if (jsonStage) {
    return (
      <div className="mt-2 space-y-2 rounded border border-border/50 bg-background/40 p-2">
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          Salida estructurada
        </p>
        <pre className="max-h-48 overflow-y-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {formatJsonOutput(snapshot.output)}
        </pre>
        {input && (
          <>
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              Entrada ({input.length.toLocaleString()} chars)
            </p>
            <pre className="max-h-24 overflow-y-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground/70">
              {input.length > 2000 ? `${input.slice(0, 2000)}…` : input}
            </pre>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded border border-border/50 bg-background/40 p-2">
      {truncated && (
        <p className="mb-1.5 font-mono text-[10px] text-accent/90">
          diff parcial — texto truncado por tamaño
        </p>
      )}
      <div className="max-h-48 overflow-y-auto font-mono text-[10px] leading-relaxed">
        {lines.map((line, index) => (
          <DiffLineRow key={`${line.type}-${index}`} line={line} />
        ))}
      </div>
    </div>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words px-1",
        line.type === "same" && "text-muted-foreground/70",
        line.type === "removed" && "bg-destructive/30 text-destructive/90",
        line.type === "added" && "bg-primary/30 text-primary/90",
      )}
    >
      <span className="mr-1 select-none opacity-60">
        {line.type === "removed" ? "-" : line.type === "added" ? "+" : " "}
      </span>
      {line.text || "\u00a0"}
    </div>
  );
}

function AuditStep({
  snapshot,
  index,
  allStages,
  originalText,
}: {
  snapshot: PurifierStageSnapshot;
  index: number;
  allStages: PurifierStageSnapshot[];
  originalText: string;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const status = getStageStatus(snapshot);
  const input = resolveStageInput(snapshot, index, allStages, originalText);
  const hasDuda =
    hasDudaMarkers(snapshot.output) ||
    (typeof snapshot.meta?.doubtCount === "number" && snapshot.meta.doubtCount > 0);
  const metaLabels = formatStageMeta(snapshot.station, snapshot.meta);

  return (
    <li className="relative pl-6">
      <span
        className={cn(
          "absolute top-1.5 left-0 size-2 rounded-full border",
          status === "completed" && !hasDuda && "border-primary/50 bg-primary/20",
          status === "completed" && hasDuda && "border-accent/60 bg-accent/30",
          status === "failed" && "border-destructive/50 bg-destructive/20",
          status === "pending" && "border-border bg-muted",
        )}
        aria-hidden
      />

      <div
        className={cn(
          "rounded border px-2.5 py-2",
          hasDuda
            ? "border-accent/40 bg-accent/10"
            : status === "failed"
              ? "border-destructive/40 bg-destructive/20"
              : "border-border/60 bg-muted/5",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatStationNumber(snapshot.station)}
              </span>
              <span className="font-mono text-[10px] font-medium text-foreground/90">
                {snapshot.name}
              </span>
              {hasDuda && (
                <span className="inline-flex items-center gap-0.5 rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 font-mono text-[8px] text-accent/90 uppercase">
                  <AlertTriangleIcon className="size-2.5" />
                  Duda
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <StatusIcon status={status} />
              <span className="font-mono text-[10px] text-muted-foreground">
                {STATUS_LABELS[status]}
              </span>
            </div>

            {metaLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {metaLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowDiff((current) => !current)}
            className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            {showDiff ? (
              <ChevronDownIcon className="size-3" />
            ) : (
              <ChevronRightIcon className="size-3" />
            )}
            Ver cambios
          </button>
        </div>

        {showDiff && <StageDiffPanel snapshot={snapshot} input={input} />}
      </div>
    </li>
  );
}

export function PurificationAuditStepper({
  snapshots,
  originalText,
  defaultExpanded = false,
}: PurificationAuditStepperProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const sortedStages = useMemo(
    () => sortStagesForDisplay(snapshots),
    [snapshots],
  );

  if (sortedStages.length === 0) return null;

  const dudaStageCount = sortedStages.filter(
    (s) =>
      hasDudaMarkers(s.output) ||
      (typeof s.meta?.doubtCount === "number" && s.meta.doubtCount > 0),
  ).length;

  return (
    <div className="shrink-0 border-b border-border/60 bg-muted/10">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-muted/20"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-3.5 text-muted-foreground" />
          )}
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            Auditoría de Procesamiento
          </p>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {sortedStages.length} estaciones
          {dudaStageCount > 0 && (
            <span className="ml-2 text-accent/90">
              · {dudaStageCount} con duda
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="max-h-64 overflow-y-auto border-t border-border/40 px-4 py-3">
          <ol className="space-y-3 border-l border-border/40">
            {sortedStages.map((snapshot) => {
              const originalIndex = snapshots.findIndex(
                (s) => s.station === snapshot.station && s.name === snapshot.name,
              );
              return (
              <AuditStep
                key={`${snapshot.station}-${snapshot.name}`}
                snapshot={snapshot}
                index={originalIndex >= 0 ? originalIndex : 0}
                allStages={snapshots}
                originalText={originalText}
              />
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
