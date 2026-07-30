"use client";

import {
  AudioPipelineBadge,
  AudioPipelineNextAction,
} from "@/components/audio-station/audio-pipeline-badge";
import { DistillationStepper } from "@/components/audio-station/distillation-stepper";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { DownloadTranscriptButton } from "@/components/download-transcript-button";
import { LiveTranscript } from "@/components/live-transcript";
import { ProcessButton } from "@/components/process-button";
import { StopProcessButton } from "@/components/stop-process-button";
import { StatusBadge } from "@/components/status-badge";
import { ViewDetailsLink } from "@/components/view-details-link";
import type { AssetMetabolismSummary } from "@/lib/audio-station/metabolism";
import {
  getAssetDisplayStatus,
  resolveMetabolismCardTone,
  type MetabolismCardTone,
} from "@/lib/audio-station/asset-display";
import type { AudioAssetSummary } from "@/lib/audio-station/types";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  GitBranchIcon,
  ListTodoIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const TONE_STYLES: Record<
  MetabolismCardTone,
  { border: string; label?: string }
> = {
  processing: { border: "border-amber-500/30" },
  hitl: {
    border: "border-amber-500/40",
    label: "Requiere validación HITL",
  },
  alma: {
    border: "border-emerald-500/30",
    label: "Coagulado · reconocido",
  },
  attention: {
    border: "border-red-900",
    label: "Atención requerida",
  },
  idle: { border: "border-zinc-800" },
};

type AudioMetabolismCardProps = {
  asset: AudioAssetSummary;
  queuedIds: Set<string>;
  purifyingIds?: Set<string>;
  activeId: string | null;
  reviewByAssetId: Map<string, string>;
  metabolism?: AssetMetabolismSummary;
  onRefresh: () => void;
};

export function AudioMetabolismCard({
  asset,
  queuedIds,
  purifyingIds = new Set(),
  activeId,
  reviewByAssetId,
  metabolism,
  onRefresh,
}: AudioMetabolismCardProps) {
  const [expanded, setExpanded] = useState(false);

  const pipeline = useMemo(
    () =>
      resolveAudioPipelineStage(asset, {
        queuedIds,
        activeId,
        purifyingIds,
        reviewByAssetId,
      }),
    [asset, queuedIds, activeId, purifyingIds, reviewByAssetId],
  );

  const tone = resolveMetabolismCardTone(pipeline);
  const toneStyle = TONE_STYLES[tone];
  const displayStatus = getAssetDisplayStatus(asset, queuedIds, activeId);
  const isProcessing =
    pipeline.stage === "stt_processing" ||
    pipeline.stage === "stt_queued" ||
    pipeline.stage === "purifying" ||
    pipeline.stage === "lineage" ||
    pipeline.stage === "quant" ||
    pipeline.stage === "vectors";
  const canExpand =
    Boolean(asset.transcript) ||
    pipeline.stage === "in_validation" ||
    pipeline.stage === "validated" ||
    pipeline.stage === "coagulated";

  const createdLabel = new Date(asset.createdAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article
      className={cn(
        "border bg-zinc-950 transition-all rounded-none",
        toneStyle.border,
      )}
    >
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => canExpand && setExpanded((value) => !value)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-1.5 text-left",
          canExpand && "cursor-pointer hover:bg-zinc-900/80",
          !canExpand && "cursor-default",
        )}
      >
        <span className="truncate max-w-[180px] text-xs font-mono text-zinc-400">
          {asset.filename}
        </span>
        <DistillationStepper
          distill={pipeline.distill}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 font-mono text-[9px] text-zinc-600">
          {createdLabel}
        </span>
        {canExpand ? (
          <ChevronDownIcon
            className={cn(
              "size-3.5 shrink-0 text-zinc-600 transition-transform",
              expanded && "rotate-180",
            )}
          />
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-zinc-800 px-3 pb-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <AudioPipelineBadge pipeline={pipeline} />
            <StatusBadge status={displayStatus} />
            {toneStyle.label ? (
              <p
                className={cn(
                  "flex items-center gap-1.5 font-mono text-[10px]",
                  tone === "hitl" && "text-amber-500",
                  tone === "alma" && "text-emerald-500",
                  tone === "attention" && "text-red-500",
                )}
              >
                {tone === "hitl" || tone === "attention" ? (
                  <AlertTriangleIcon className="size-3" />
                ) : (
                  <CheckCircle2Icon className="size-3" />
                )}
                {toneStyle.label}
              </p>
            ) : null}
          </div>

          {isProcessing && asset.id === activeId ? (
            <LiveTranscript
              assetId={asset.id}
              filename={asset.filename}
              initialStatus={asset.status}
            />
          ) : asset.transcript?.preview ? (
            <p className="border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] leading-relaxed text-zinc-500 rounded-none">
              {asset.transcript.preview}
            </p>
          ) : null}

          {metabolism ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {metabolism.tasks.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    <ListTodoIcon className="size-3" />
                    Action items
                  </p>
                  <ul className="space-y-1.5">
                    {metabolism.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-[10px] text-zinc-400 rounded-none"
                      >
                        {task.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {metabolism.events.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    <CalendarIcon className="size-3" />
                    Calendario
                  </p>
                  <ul className="space-y-1.5">
                    {metabolism.events.map((event) => (
                      <li
                        key={event.id}
                        className="border border-zinc-800 px-2 py-1.5 font-mono text-[10px] text-amber-500/80 rounded-none"
                      >
                        {event.content}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {metabolism.tags.length > 0 ? (
                <div className="space-y-2 sm:col-span-2">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    <SparklesIcon className="size-3" />
                    Esencias
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {metabolism.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 rounded-none"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {metabolism.chunkCount > 0 || metabolism.nodeCount > 0 ? (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  {metabolism.chunkCount > 0 ? (
                    <span className="inline-flex items-center gap-1 border border-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-400 rounded-none">
                      <GitBranchIcon className="size-3" />
                      {metabolism.chunkCount} chunks fractales
                    </span>
                  ) : null}
                  {metabolism.nodeCount > 0 ? (
                    <Link
                      href="/grafo"
                      className="inline-flex items-center gap-1 border border-zinc-800 px-2 py-1 font-mono text-[10px] text-amber-500/80 hover:border-amber-500/40 rounded-none"
                    >
                      {metabolism.nodeCount} nodos en Grafo →
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
            {pipeline.stage === "stt_error" ? (
              <ProcessButton assetId={asset.id} onProcessed={onRefresh} />
            ) : null}
            {isProcessing ? (
              <StopProcessButton assetId={asset.id} onStopped={onRefresh} />
            ) : null}
            {asset.transcript ? (
              <DownloadTranscriptButton assetId={asset.id} size="sm" />
            ) : null}
            <AudioPipelineNextAction
              pipeline={pipeline}
              assetId={asset.id}
              filename={asset.filename}
              onPurified={onRefresh}
            />
            <ViewDetailsLink assetId={asset.id} />
            <DeleteAssetButton
              assetId={asset.id}
              filename={asset.filename}
              onDeleted={onRefresh}
            />
            {pipeline.stage === "in_validation" && pipeline.reviewId ? (
              <Link
                href={`/validar?id=${pipeline.reviewId}`}
                className="ml-auto font-mono text-[10px] text-amber-500 underline-offset-2 hover:underline"
              >
                Validar ahora →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
