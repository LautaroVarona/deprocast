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
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AssetRow = {
  id: string;
  filename: string;
  status: string;
  transcript: { id: string; preview?: string } | null;
};

type QueueStatus = {
  active: { id: string } | null;
  queuedCount: number;
};

type PurifyingState = Record<string, boolean>;

export function AudioChannel() {
  const { gravity } = useIngesta();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [purifying, setPurifying] = useState<PurifyingState>({});
  const [purifyingAll, setPurifyingAll] = useState(false);
  const [queuedAssetIds, setQueuedAssetIds] = useState<Set<string>>(new Set());

  const loadQueuedIds = useCallback(async () => {
    try {
      const response = await fetch("/api/purifier/review", { cache: "no-store" });
      if (!response.ok) return;
      const data: { assetIds?: string[] } = await response.json();
      setQueuedAssetIds(new Set(data.assetIds ?? []));
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
      const response = await fetch("/api/process/status");
      if (!response.ok) return;
      const data: QueueStatus = await response.json();
      setQueueStatus(data);
    } catch {
      // no crítico
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadAssets(), loadStatus(), loadQueuedIds()]);
  }, [loadAssets, loadStatus, loadQueuedIds]);

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

  const transcribedAssets = useMemo(() => {
    const withTranscript = assets.filter((a) => a.transcript);
    const pending: AssetRow[] = [];
    const alreadyQueued: AssetRow[] = [];

    for (const asset of withTranscript) {
      if (queuedAssetIds.has(asset.id)) {
        alreadyQueued.push(asset);
      } else {
        pending.push(asset);
      }
    }

    return [...pending, ...alreadyQueued];
  }, [assets, queuedAssetIds]);

  const pendingCount = transcribedAssets.filter(
    (a) => !queuedAssetIds.has(a.id),
  ).length;

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

        setQueuedAssetIds((current) => new Set([...current, asset.id]));

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
    const pending = transcribedAssets.filter((a) => !queuedAssetIds.has(a.id));
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
  }, [transcribedAssets, queuedAssetIds, ingestAsset]);

  const isAnyPurifying =
    purifyingAll || Object.values(purifying).some(Boolean);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="font-mono text-[10px] text-muted-foreground">
          .wav · .m4a · .mp3 · transcripción → purificación
        </p>
        <Badge variant="outline" className="font-mono text-[9px]">
          {queueLabel}
        </Badge>
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
              Transcripciones · {transcribedAssets.length}
              {queuedAssetIds.size > 0 && (
                <span className="normal-case text-foreground/50">
                  {" "}
                  · {queuedAssetIds.size} en purificación
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
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
                      Ingestar todo
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

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingAssets ? (
              <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">
                Cargando activos…
              </p>
            ) : transcribedAssets.length === 0 ? (
              <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">
                Sin transcripciones listas para ingestar.
              </p>
            ) : (
              <ul className="space-y-2">
                {transcribedAssets.map((asset) => {
                  const isPurifying = purifying[asset.id];
                  const isQueued = queuedAssetIds.has(asset.id);

                  return (
                    <li
                      key={asset.id}
                      className={cn(
                        "rounded border border-border bg-background p-2 transition-opacity",
                        isQueued && "opacity-45",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
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

                        {isQueued ? (
                          <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] text-muted-foreground">
                            <CheckCircle2Icon className="size-3" />
                            En purificación
                          </span>
                        ) : (
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
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
