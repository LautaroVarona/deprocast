"use client";

import { MicroStationRow } from "@/components/audio-station/micro-station-row";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { ProcessButton } from "@/components/process-button";
import { StopProcessButton } from "@/components/stop-process-button";
import { ViewDetailsLink } from "@/components/view-details-link";
import type { AssetMetabolismSummary } from "@/lib/audio-station/metabolism";
import {
  resolveMetabolismCardTone,
  type MetabolismCardTone,
} from "@/lib/audio-station/asset-display";
import type { AudioAssetSummary } from "@/lib/audio-station/types";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { buildValidarAduanaHref } from "@/lib/navigation/resolve-href";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const TONE_BORDER: Record<MetabolismCardTone, string> = {
  processing: "border-amber-700/50",
  hitl: "border-amber-600/60",
  alma: "border-legion-marble/50",
  attention: "border-rose-800",
  idle: "border-stone-700",
};

type AudioMetabolismCardProps = {
  asset: AudioAssetSummary;
  queuedIds: Set<string>;
  purifyingIds?: Set<string>;
  activeId: string | null;
  reviewByAssetId: Map<string, string>;
  metabolism?: AssetMetabolismSummary;
  onRefresh: () => void;
  tactical?: boolean;
};

export function AudioMetabolismCard({
  asset,
  queuedIds,
  purifyingIds = new Set(),
  activeId,
  reviewByAssetId,
  onRefresh,
}: AudioMetabolismCardProps) {
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
  const isProcessing =
    pipeline.stage === "stt_processing" ||
    pipeline.stage === "stt_queued" ||
    pipeline.stage === "purifying" ||
    pipeline.stage === "lineage" ||
    pipeline.stage === "quant" ||
    pipeline.stage === "vectors";
  const isErr =
    pipeline.stage === "stt_error" || pipeline.distill.station === "ERROR";

  const footer = isErr
    ? pipeline.distill.errorLabel ??
      (pipeline.pipelineError
        ? `[ERR: ${pipeline.pipelineError.slice(0, 40)}]`
        : "[ERR]")
    : pipeline.stage === "coagulated" || pipeline.stage === "validated"
      ? "[COAGVLADO]"
      : pipeline.stage === "in_validation"
        ? "[SENADO · VALIDAR]"
        : `[${pipeline.pipelineStation ?? "DESTILANDO"}]`;

  const lineage = asset.lineage;
  const [fecha, setFecha] = useState(lineage?.fecha ?? "");
  const [hora, setHora] = useState(lineage?.hora ?? "");
  const [savingLineage, setSavingLineage] = useState(false);

  useEffect(() => {
    setFecha(lineage?.fecha ?? "");
    setHora(lineage?.hora ?? "");
  }, [lineage?.fecha, lineage?.hora, asset.id]);

  const saveLineage = async () => {
    if (!fecha.trim() || !hora.trim()) return;
    setSavingLineage(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: fecha.trim(), hora: hora.trim() }),
      });
      if (res.ok) onRefresh();
    } finally {
      setSavingLineage(false);
    }
  };

  return (
    <article
      className={cn(
        "flex h-36 flex-col justify-between border border-b-4 border-b-stone-950 bg-stone-800 p-3 font-mono rounded-none transition-colors hover:border-amber-700/40",
        TONE_BORDER[tone],
        isErr && "border-rose-800",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="space-y-1">
        <p className="truncate font-serif text-xs tracking-tight text-legion-bone">
          {asset.filename}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-legion-patina">
          <input
            type="text"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            onBlur={() => void saveLineage()}
            onClick={(e) => e.stopPropagation()}
            placeholder="DD/MM/YYYY"
            aria-label="Fecha de linaje"
            className="w-[78px] border border-stone-700 bg-stone-950 px-1 py-0.5 text-[9px] text-legion-bone outline-none focus:border-amber-700 rounded-none"
          />
          <input
            type="text"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            onBlur={() => void saveLineage()}
            onClick={(e) => e.stopPropagation()}
            placeholder="HH:MM"
            aria-label="Hora de linaje"
            className="w-[44px] border border-stone-700 bg-stone-950 px-1 py-0.5 text-[9px] text-amber-500/90 outline-none focus:border-amber-700 rounded-none"
          />
          {lineage?.lugar ? (
            <span className="truncate max-w-[80px]">{lineage.lugar}</span>
          ) : null}
          {lineage?.indefinido ? <span>[¿?]</span> : null}
          {savingLineage ? <span className="animate-pulse">…</span> : null}
        </div>
      </header>

      <MicroStationRow distill={pipeline.distill} />

      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "truncate text-[10px] uppercase",
            isErr
              ? "text-rose-800"
              : pipeline.stage === "coagulated"
                ? "text-legion-marble"
                : "text-legion-patina",
            isProcessing && "animate-pulse text-amber-500/90",
          )}
          title={
            isErr
              ? (pipeline.pipelineError ?? pipeline.distill.errorLabel ?? "Error")
              : undefined
          }
        >
          {footer}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {pipeline.stage === "stt_error" || isErr ? (
            <ProcessButton assetId={asset.id} onProcessed={onRefresh} />
          ) : null}
          {isProcessing ? (
            <StopProcessButton assetId={asset.id} onStopped={onRefresh} />
          ) : null}
          {pipeline.stage === "in_validation" && pipeline.reviewId ? (
            <Link
              href={buildValidarAduanaHref(pipeline.reviewId)}
              className="text-[9px] text-amber-500 hover:underline"
            >
              Senado
            </Link>
          ) : null}
          <ViewDetailsLink assetId={asset.id} />
          <DeleteAssetButton
            assetId={asset.id}
            filename={asset.filename}
            onDeleted={onRefresh}
          />
        </div>
      </div>
    </article>
  );
}

/** @deprecated Prefer AudioMetabolismCard with tactical prop. */
export { DistillationStepper } from "@/components/audio-station/distillation-stepper";
