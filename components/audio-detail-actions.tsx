"use client";

import { DeleteAssetButton } from "@/components/delete-asset-button";
import { PurifyAudioButton } from "@/components/audio-station/purify-audio-button";
import { StopProcessButton } from "@/components/stop-process-button";
import Link from "next/link";

type AudioDetailActionsProps = {
  assetId: string;
  filename: string;
  status: string;
  hasTranscript?: boolean;
  reviewId?: string | null;
};

export function AudioDetailActions({
  assetId,
  filename,
  status,
  hasTranscript = false,
  reviewId = null,
}: AudioDetailActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasTranscript && reviewId ? (
        <Link
          href={`/validar?id=${reviewId}`}
          className="inline-flex h-9 items-center rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15"
        >
          Abrir en Validar →
        </Link>
      ) : null}

      {hasTranscript && !reviewId ? (
        <PurifyAudioButton
          assetId={assetId}
          filename={filename}
          size="default"
          onPurified={(id) => {
            window.location.href = `/validar?id=${id}`;
          }}
        />
      ) : null}

      {status === "PROCESSING" && (
        <StopProcessButton
          assetId={assetId}
          onStopped={() => window.location.reload()}
        />
      )}
      <DeleteAssetButton
        assetId={assetId}
        filename={filename}
        onDeleted={() => undefined}
        redirectTo="/audio"
      />
    </div>
  );
}
