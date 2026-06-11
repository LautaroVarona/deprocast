"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";

type DownloadTranscriptButtonProps = {
  assetId: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "xs";
};

export function DownloadTranscriptButton({
  assetId,
  label = "Descargar .md",
  variant = "outline",
  size = "default",
}: DownloadTranscriptButtonProps) {
  async function handleDownload() {
    try {
      const response = await fetch(`/api/transcripts/${assetId}/download`);

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "No se pudo descargar la transcripción.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
      const filename = decodeURIComponent(
        filenameMatch?.[1] ?? filenameMatch?.[2] ?? "transcripcion.md",
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al descargar.";
      toast.error(message);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={() => void handleDownload()}>
      <DownloadIcon />
      {label}
    </Button>
  );
}
