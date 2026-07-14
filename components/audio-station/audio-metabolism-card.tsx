"use client";

import {
  AudioPipelineBadge,
  AudioPipelineNextAction,
} from "@/components/audio-station/audio-pipeline-badge";
import { MetabolismPhaseStrip } from "@/components/audio-station/metabolism-phase-strip";
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
  WavesIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const TONE_STYLES: Record<
  MetabolismCardTone,
  { border: string; glow: string; label?: string }
> = {
  processing: {
    border: "border-sky-500/35",
    glow: "shadow-[0_0_24px_rgba(56,189,248,0.08)]",
  },
  hitl: {
    border: "border-amber-500/40",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.1)]",
    label: "Requiere validación HITL",
  },
  alma: {
    border: "border-emerald-500/25",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.06)]",
    label: "Alma · Restricción superada",
  },
  attention: {
    border: "border-amber-500/30",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.06)]",
    label: "Atención requerida",
  },
  idle: {
    border: "border-white/10",
    glow: "",
  },
};

function WaveformPulse() {
  return (
    <div className="flex h-5 items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="w-0.5 rounded-full bg-sky-400/80 animate-pulse"
          style={{
            height: `${8 + (bar % 3) * 6}px`,
            animationDelay: `${bar * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}

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
    pipeline.stage === "purifying";
  const canExpand =
    Boolean(asset.transcript) ||
    pipeline.stage === "in_validation" ||
    pipeline.stage === "validated";

  const createdLabel = new Date(asset.createdAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article
      className={cn(
        "rounded-xl border bg-black/30 transition-all",
        toneStyle.border,
        toneStyle.glow,
        expanded && "bg-black/45",
      )}
    >
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => canExpand && setExpanded((value) => !value)}
        className={cn(
          "flex w-full flex-col gap-3 p-4 text-left",
          canExpand && "cursor-pointer hover:bg-white/[0.02]",
          !canExpand && "cursor-default",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {isProcessing ? <WaveformPulse /> : null}
              <p className="truncate font-mono text-sm text-white/90">
                {asset.filename}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AudioPipelineBadge pipeline={pipeline} />
              <StatusBadge status={displayStatus} />
              <span className="font-mono text-[9px] text-white/35">
                {createdLabel}
              </span>
            </div>
            <MetabolismPhaseStrip pipeline={pipeline} compact />
            {toneStyle.label ? (
              <p
                className={cn(
                  "flex items-center gap-1.5 font-mono text-[10px]",
                  tone === "hitl" && "text-amber-200/90",
                  tone === "alma" && "text-emerald-200/80",
                  tone === "attention" && "text-amber-200/80",
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
            {!expanded && asset.transcript?.preview ? (
              <p className="line-clamp-2 font-mono text-[10px] leading-relaxed text-white/40">
                {asset.transcript.preview}
              </p>
            ) : null}
          </div>

          {canExpand ? (
            <ChevronDownIcon
              className={cn(
                "size-4 shrink-0 text-white/30 transition-transform",
                expanded && "rotate-180",
              )}
            />
          ) : null}
        </div>

        {!expanded && metabolism && tone !== "idle" && tone !== "processing" ? (
          <div className="flex flex-wrap gap-2 font-mono text-[9px] text-white/45">
            {metabolism.taskCount > 0 ? (
              <span className="rounded border border-white/10 px-1.5 py-0.5">
                {metabolism.taskCount} tarea
                {metabolism.taskCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {metabolism.eventCount > 0 ? (
              <span className="rounded border border-sky-500/20 px-1.5 py-0.5 text-sky-200/70">
                {metabolism.eventCount} en calendario
              </span>
            ) : null}
            {metabolism.chunkCount > 0 ? (
              <span className="rounded border border-violet-500/20 px-1.5 py-0.5 text-violet-200/70">
                {metabolism.chunkCount} chunks
              </span>
            ) : null}
            {metabolism.nodeCount > 0 ? (
              <span className="rounded border border-emerald-500/20 px-1.5 py-0.5 text-emerald-200/70">
                {metabolism.nodeCount} nodos KG
              </span>
            ) : null}
          </div>
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-white/8 px-4 pb-4 pt-3">
          {isProcessing && asset.id === activeId ? (
            <LiveTranscript
              assetId={asset.id}
              filename={asset.filename}
              initialStatus={asset.status}
            />
          ) : asset.transcript?.preview ? (
            <p className="rounded border border-white/8 bg-black/25 p-3 font-mono text-[10px] leading-relaxed text-white/55">
              {asset.transcript.preview}
            </p>
          ) : null}

          {metabolism ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {metabolism.tasks.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/40">
                    <ListTodoIcon className="size-3" />
                    Action items
                  </p>
                  <ul className="space-y-1.5">
                    {metabolism.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded border border-white/8 bg-black/20 px-2 py-1.5 font-mono text-[10px] text-white/70"
                      >
                        {task.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {metabolism.events.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/40">
                    <CalendarIcon className="size-3" />
                    Calendario
                  </p>
                  <ul className="space-y-1.5">
                    {metabolism.events.map((event) => (
                      <li
                        key={event.id}
                        className="rounded border border-sky-500/15 bg-sky-500/5 px-2 py-1.5 font-mono text-[10px] text-sky-100/80"
                      >
                        {event.content}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {metabolism.tags.length > 0 ? (
                <div className="space-y-2 sm:col-span-2">
                  <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/40">
                    <SparklesIcon className="size-3" />
                    Esencias
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {metabolism.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-amber-500/20 bg-amber-500/8 px-1.5 py-0.5 font-mono text-[9px] text-amber-200/80"
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
                    <span className="inline-flex items-center gap-1 rounded border border-violet-500/20 bg-violet-500/8 px-2 py-1 font-mono text-[9px] text-violet-200/80">
                      <GitBranchIcon className="size-3" />
                      {metabolism.chunkCount} chunks fractales
                    </span>
                  ) : null}
                  {metabolism.nodeCount > 0 ? (
                    <Link
                      href="/grafo"
                      className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 font-mono text-[9px] text-emerald-200/80 hover:bg-emerald-500/12"
                    >
                      {metabolism.nodeCount} nodos en Grafo →
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-white/6 pt-3">
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
                className="ml-auto font-mono text-[9px] text-amber-200/90 underline-offset-2 hover:underline"
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
