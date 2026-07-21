"use client";

import {
  AudioPipelineBadge,
} from "@/components/audio-station/audio-pipeline-badge";
import { PurifyAudioButton } from "@/components/audio-station/purify-audio-button";
import { useAudioStation } from "@/components/audio-station/audio-station-context";
import { POSTPROCESS_PIPELINE } from "@/lib/audio-station/constants";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import { GitBranchIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function DownstreamPanel() {
  const { assets, queueStatus, reviewByAssetId, refresh } = useAudioStation();
  const [isPurifyingAll, setIsPurifyingAll] = useState(false);

  const queuedIds = new Set(queueStatus?.queuedIds ?? []);
  const activeId = queueStatus?.active?.id ?? null;

  const buckets = useMemo(() => {
    const pendingPurify: typeof assets = [];
    const inValidation: Array<{
      asset: (typeof assets)[0];
      reviewId: string;
      pipeline: ReturnType<typeof resolveAudioPipelineStage>;
    }> = [];
    const validated: typeof assets = [];

    for (const asset of assets) {
      const pipeline = resolveAudioPipelineStage(asset, {
        queuedIds,
        activeId,
        reviewByAssetId,
      });

      if (pipeline.stage === "pending_purify") {
        pendingPurify.push(asset);
      } else if (pipeline.stage === "in_validation" && pipeline.reviewId) {
        inValidation.push({ asset, reviewId: pipeline.reviewId, pipeline });
      } else if (pipeline.stage === "validated") {
        validated.push(asset);
      }
    }

    return { pendingPurify, inValidation, validated };
  }, [assets, queuedIds, activeId, reviewByAssetId]);

  const handlePurified = () => {
    void refresh();
  };

  const handlePurifyAll = async () => {
    if (buckets.pendingPurify.length === 0 || isPurifyingAll) return;

    setIsPurifyingAll(true);
    try {
      const response = await fetch("/api/audio-station/purify-pending", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron purificar los audios.");
      }

      if (data.purified > 0) {
        toast.success(`${data.purified} audio(s) enviados a Validar.`, {
          action: {
            label: "Validar →",
            onClick: () => {
              window.location.href = "/validar";
            },
          },
        });
      } else if (data.total === 0) {
        toast.message("No hay audios transcritos pendientes de purificar.");
      } else {
        toast.error("No se pudo purificar ningún audio.");
      }

      void refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al purificar en lote.",
      );
    } finally {
      setIsPurifyingAll(false);
    }
  };

  return (
    <section className="audio-noir-panel space-y-4 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <GitBranchIcon className="size-4 text-primary" />
          <h2 className="font-mono text-sm font-medium text-muted-foreground">
            Downstream · hacia Validar
          </h2>
        </div>
        <p className="max-w-2xl font-mono text-[10px] leading-relaxed text-muted-foreground">
          Tras el STT, el audio pasa por Purifier y aparece en{" "}
          <Link href="/validar" className="text-primary/80 hover:underline">
            /validar
          </Link>
          . Los audios nuevos se purifican automáticamente al terminar la
          transcripción; si algo quedó pendiente, envialo desde acá.
        </p>
      </div>

      {buckets.pendingPurify.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-primary/25 bg-primary/8 px-3 py-2.5">
          <p className="font-mono text-[10px] text-primary/90">
            {buckets.pendingPurify.length} audio
            {buckets.pendingPurify.length === 1 ? "" : "s"} transcrito
            {buckets.pendingPurify.length === 1 ? "" : "s"} sin enviar a Validar.
          </p>
          <button
            type="button"
            disabled={isPurifyingAll}
            onClick={() => void handlePurifyAll()}
            className="inline-flex items-center gap-1.5 rounded border border-primary/30 bg-primary/20 px-2.5 py-1 font-mono text-[10px] text-foreground hover:bg-primary/30 disabled:opacity-50"
          >
            {isPurifyingAll ? (
              <Loader2Icon className="size-3 animate-spin" />
            ) : (
              <ShieldCheckIcon className="size-3" />
            )}
            Purificar todos
          </button>
        </div>
      ) : buckets.inValidation.length > 0 ? (
        <div className="rounded border border-primary/20 bg-primary/8 px-3 py-2.5">
          <p className="font-mono text-[10px] text-primary/90">
            {buckets.inValidation.length} en cola de Validar.{" "}
            <Link href="/validar" className="underline underline-offset-2">
              Ir a Validar →
            </Link>
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            Pendientes de purificar · {buckets.pendingPurify.length}
          </p>
          <div className="max-h-48 overflow-y-auto rounded border border-border bg-muted/40">
            {buckets.pendingPurify.length === 0 ? (
              <p className="py-6 text-center font-mono text-[10px] text-muted-foreground">
                Nada pendiente — el STT auto-envía a Validar.
              </p>
            ) : (
              <ul className="divide-y divide-white/6">
                {buckets.pendingPurify.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {asset.filename}
                      </p>
                    </div>
                    <PurifyAudioButton
                      assetId={asset.id}
                      filename={asset.filename}
                      onPurified={handlePurified}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            En Validar · {buckets.inValidation.length}
          </p>
          <div className="max-h-48 overflow-y-auto rounded border border-border bg-muted/40">
            {buckets.inValidation.length === 0 ? (
              <p className="py-6 text-center font-mono text-[10px] text-muted-foreground">
                Sin revisiones activas desde audio.
              </p>
            ) : (
              <ul className="divide-y divide-white/6">
                {buckets.inValidation.map(({ asset, reviewId }) => (
                  <li
                    key={asset.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <p className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
                      {asset.filename}
                    </p>
                    <Link
                      href={`/validar?id=${reviewId}`}
                      className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-primary/90 underline-offset-2 hover:underline"
                    >
                      <ShieldCheckIcon className="size-3" />
                      Validar →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <details className="group rounded border border-border bg-muted/40">
        <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase marker:content-none [&::-webkit-details-marker]:hidden">
          Mapa de etapas downstream
        </summary>
        <ol className="space-y-3 border-t border-border/6 px-3 py-3">
          {POSTPROCESS_PIPELINE.map((stage, index) => (
            <li key={stage.id} className="flex gap-3">
              <span className="font-mono text-[10px] text-muted-foreground">{index + 1}</span>
              <div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {stage.label}
                  {stage.route ? (
                    <Link
                      href={stage.route}
                      className="ml-2 text-primary/70 hover:underline"
                    >
                      abrir →
                    </Link>
                  ) : null}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
