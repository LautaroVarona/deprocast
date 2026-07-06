"use client";

import {
  buildCaptureGravity,
  postIngestaCapture,
} from "@/components/ingesta/capture-client";
import { useIngesta } from "@/components/ingesta/ingesta-context";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CAPTURE_SUCCESS_TOAST } from "@/lib/purifier/constants";
import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

type AssetRow = {
  id: string;
  filename: string;
  status: string;
  transcript: { id: string; preview?: string; validated?: boolean } | null;
};

type ReviewRecord = {
  reviewId: string;
  assetId?: string;
};

type QueueStatus = {
  active: { id: string } | null;
  queuedCount: number;
};

type PurifyingState = Record<string, boolean>;

type AudioIngestBuckets = {
  pending: AssetRow[];
  ingested: AssetRow[];
  validated: AssetRow[];
};

function bucketTranscribedAssets(
  assets: AssetRow[],
  reviewByAssetId: Map<string, string>,
): AudioIngestBuckets {
  const pending: AssetRow[] = [];
  const ingested: AssetRow[] = [];
  const validated: AssetRow[] = [];

  for (const asset of assets) {
    if (!asset.transcript) continue;

    if (asset.transcript.validated) {
      validated.push(asset);
    } else if (reviewByAssetId.has(asset.id)) {
      ingested.push(asset);
    } else {
      pending.push(asset);
    }
  }

  return { pending, ingested, validated };
}

function AssetListSection({
  title,
  assets,
  emptyLabel,
  children,
}: {
  title: string;
  assets: AssetRow[];
  emptyLabel?: string;
  children: (asset: AssetRow) => ReactNode;
}) {
  if (assets.length === 0 && !emptyLabel) return null;

  return (
    <section className="space-y-1.5">
      <p className="px-0.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
        {title} · {assets.length}
      </p>
      {assets.length === 0 ? (
        <p className="py-2 text-center font-mono text-[9px] text-muted-foreground/70">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="rounded border border-border bg-background p-2"
            >
              {children(asset)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AssetPreview({ asset }: { asset: AssetRow }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-mono text-[10px] font-medium">
        {asset.filename}
      </p>
      {asset.transcript?.preview && (
        <p className="mt-1 line-clamp-2 font-mono text-[9px] leading-relaxed text-muted-foreground">
          {asset.transcript.preview}
        </p>
      )}
    </div>
  );
}

export function AudioChannel() {
  const { gravity } = useIngesta();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [purifying, setPurifying] = useState<PurifyingState>({});
  const [purifyingAll, setPurifyingAll] = useState(false);
  const [reviewByAssetId, setReviewByAssetId] = useState<Map<string, string>>(
    new Map(),
  );

  const loadReviewMap = useCallback(async () => {
    try {
      const response = await fetch("/api/purifier/review", { cache: "no-store" });
      if (!response.ok) return;
      const data: { records?: ReviewRecord[] } = await response.json();
      const next = new Map<string, string>();
      for (const record of data.records ?? []) {
        if (record.assetId) {
          next.set(record.assetId, record.reviewId);
        }
      }
      setReviewByAssetId(next);
    } catch {
      // no crítico
    }
  }, []);

  const loadAssets = useCallback(async () => {
    try {
      const response = await fetch("/api/assets", { cache: "no-store" });
      if (!response.ok) return;
      const data: AssetRow[] = await response.json();
      setAssets(data);
    } catch {
      // no crítico
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchJson<QueueStatus>("/api/process/status");
      setQueueStatus(data);
    } catch {
      // no crítico
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadAssets(), loadStatus(), loadReviewMap()]);
  }, [loadAssets, loadStatus, loadReviewMap]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const queueLabel = queueStatus
    ? queueStatus.active
      ? `Esterilizando · ${queueStatus.queuedCount} en cola`
      : queueStatus.queuedCount > 0
        ? `${queueStatus.queuedCount} en cola`
        : "Cola vacía"
    : "…";

  const { pending, ingested, validated } = useMemo(
    () => bucketTranscribedAssets(assets, reviewByAssetId),
    [assets, reviewByAssetId],
  );

  const transcribedCount = pending.length + ingested.length + validated.length;

  const ingestAsset = useCallback(
    async (asset: AssetRow, silent = false): Promise<boolean> => {
      setPurifying((current) => ({ ...current, [asset.id]: true }));

      try {
        const data = await postIngestaCapture({
          channel: "audio",
          assetId: asset.id,
          gravity: {
            ...buildCaptureGravity(gravity),
            title:
              gravity.title ||
              asset.filename.replace(/\.[^.]+$/, ""),
          },
        });

        setReviewByAssetId((current) => {
          const next = new Map(current);
          next.set(asset.id, data.reviewId);
          return next;
        });

        if (!silent) {
          toast.success(CAPTURE_SUCCESS_TOAST, {
            description: "El sistema está estructurando la transcripción.",
            action: {
              label: "Validar →",
              onClick: () => {
                window.location.href = `/validar?id=${data.reviewId}`;
              },
            },
          });
        }

        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo enviar el audio a purificación";
        if (!silent) toast.error(message);
        return false;
      } finally {
        setPurifying((current) => ({ ...current, [asset.id]: false }));
      }
    },
    [gravity],
  );

  const handleIngest = useCallback(
    (asset: AssetRow) => void ingestAsset(asset),
    [ingestAsset],
  );

  const handleIngestAll = useCallback(async () => {
    if (pending.length === 0) return;

    setPurifyingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const asset of pending) {
      const ok = await ingestAsset(asset, true);
      if (ok) successCount += 1;
      else errorCount += 1;
    }

    setPurifyingAll(false);

    if (successCount > 0) {
      toast.success(CAPTURE_SUCCESS_TOAST, {
        description: `${successCount} audio${successCount === 1 ? "" : "s"} en cola de purificación.`,
        action: {
          label: "Validar →",
          onClick: () => {
            window.location.href = "/validar";
          },
        },
      });
    }
    if (errorCount > 0) {
      toast.error(
        `${errorCount} archivo${errorCount === 1 ? "" : "s"} no se pudo${errorCount === 1 ? "" : "ieron"} purificar`,
      );
    }
  }, [pending, ingestAsset]);

  const isAnyPurifying =
    purifyingAll || Object.values(purifying).some(Boolean);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="font-mono text-[10px] text-muted-foreground">
          .wav · .m4a · .mp3 · STT → purificación automática → /validar
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/audio"
            className="font-mono text-[9px] text-primary underline-offset-2 hover:underline"
          >
            Estación Audio →
          </Link>
          <Badge variant="outline" className="font-mono text-[9px]">
            {queueLabel}
          </Badge>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-2">
        <div className="shrink-0">
          <UploadDropzone
            variant="embedded"
            onUploaded={() => void refresh()}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded border border-border bg-muted/20">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1.5">
            <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
              Transcripciones · {transcribedCount}
              {ingested.length > 0 && (
                <span className="normal-case text-foreground/50">
                  {" "}
                  · {ingested.length} en validación
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {pending.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isAnyPurifying}
                  onClick={() => void handleIngestAll()}
                  className="h-6 gap-1 font-mono text-[9px]"
                >
                  {purifyingAll ? (
                    <>
                      <Loader2Icon className="size-3 animate-spin" />
                      Purificando todo…
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="size-3" />
                      Ingestar todo ({pending.length})
                    </>
                  )}
                </Button>
              )}
              <Link
                href="/validar"
                className="font-mono text-[9px] text-primary underline-offset-2 hover:underline"
              >
                Validar →
              </Link>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
            {loadingAssets ? (
              <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">
                Cargando activos…
              </p>
            ) : transcribedCount === 0 ? (
              <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">
                Sin transcripciones listas para ingestar.
              </p>
            ) : (
              <>
                <AssetListSection
                  title="Pendientes de ingestar"
                  assets={pending}
                >
                  {(asset) => {
                    const isPurifying = purifying[asset.id];

                    return (
                      <div className="flex items-start justify-between gap-2">
                        <AssetPreview asset={asset} />
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          disabled={isPurifying || isAnyPurifying}
                          onClick={() => handleIngest(asset)}
                          className={cn(
                            "shrink-0 gap-1 font-mono text-[9px]",
                            isPurifying && "opacity-80",
                          )}
                        >
                          {isPurifying ? (
                            <>
                              <Loader2Icon className="size-3 animate-spin" />
                              Purificando…
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="size-3" />
                              Ingestar
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  }}
                </AssetListSection>

                <AssetListSection title="Ya ingestados" assets={ingested}>
                  {(asset) => {
                    const reviewId = reviewByAssetId.get(asset.id);

                    return (
                      <div className="flex items-start justify-between gap-2 opacity-80">
                        <AssetPreview asset={asset} />
                        {reviewId ? (
                          <Link
                            href={`/validar?id=${reviewId}`}
                            className="flex shrink-0 items-center gap-1 font-mono text-[9px] text-primary underline-offset-2 hover:underline"
                          >
                            <CheckCircle2Icon className="size-3" />
                            En validación →
                          </Link>
                        ) : (
                          <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] text-muted-foreground">
                            <CheckCircle2Icon className="size-3" />
                            En validación
                          </span>
                        )}
                      </div>
                    );
                  }}
                </AssetListSection>

                <AssetListSection title="Ya validados" assets={validated}>
                  {(asset) => (
                    <div className="flex items-start justify-between gap-2 opacity-60">
                      <AssetPreview asset={asset} />
                      <Link
                        href={`/audio/${asset.id}`}
                        className="shrink-0 font-mono text-[9px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    </div>
                  )}
                </AssetListSection>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
