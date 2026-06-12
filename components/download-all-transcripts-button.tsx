"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DownloadAllTranscriptsButtonProps = {
  completedCount: number;
};

export function DownloadAllTranscriptsButton({
  completedCount,
}: DownloadAllTranscriptsButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownloadAll() {
    if (completedCount === 0) {
      toast.error("No hay transcripciones completadas para descargar.");
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch("/api/transcripts/download-all");

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          data?.error ?? "No se pudieron descargar las transcripciones.",
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(
        /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i,
      );
      const filename = decodeURIComponent(
        filenameMatch?.[1] ?? filenameMatch?.[2] ?? "transcripciones.md",
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Descarga iniciada.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al descargar.";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={completedCount === 0 || isDownloading}
      onClick={() => void handleDownloadAll()}
    >
      {isDownloading ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      Descargar todo (.md)
    </Button>
  );
}
