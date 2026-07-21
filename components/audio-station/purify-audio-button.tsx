"use client";

import { CAPTURE_SUCCESS_TOAST } from "@/lib/purifier/constants";
import { cn } from "@/lib/utils";
import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PurifyAudioButtonProps = {
  assetId: string;
  filename: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  onPurified?: (reviewId: string) => void;
};

export function PurifyAudioButton({
  assetId,
  filename,
  disabled = false,
  size = "sm",
  className,
  onPurified,
}: PurifyAudioButtonProps) {
  const [isPurifying, setIsPurifying] = useState(false);

  const handlePurify = async () => {
    if (isPurifying || disabled) return;

    setIsPurifying(true);
    try {
      const response = await fetch("/api/purifier/purify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          channel: "audio",
          gravity: {
            title: filename.replace(/\.[^.]+$/, ""),
            sourceType: "personal_writing",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo enviar a purificación.");
      }

      onPurified?.(data.reviewId);

      toast.success(CAPTURE_SUCCESS_TOAST, {
        description: "Ya podés revisarlo en Validar.",
        action: {
          label: "Validar →",
          onClick: () => {
            window.location.href = `/validar?id=${data.reviewId}`;
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al purificar el audio.",
      );
    } finally {
      setIsPurifying(false);
    }
  };

  const sizeClasses =
    size === "sm"
      ? "h-6 gap-1 px-2 font-mono text-[10px]"
      : "gap-2 px-3 text-xs";

  return (
    <button
      type="button"
      disabled={disabled || isPurifying}
      onClick={() => void handlePurify()}
      className={cn(
        "inline-flex shrink-0 items-center rounded border border-primary/35 bg-primary/15 text-primary transition-colors hover:bg-primary/25 disabled:opacity-50",
        sizeClasses,
        className,
      )}
    >
      {isPurifying ? (
        <Loader2Icon className="size-3 animate-spin" />
      ) : (
        <ShieldCheckIcon className="size-3" />
      )}
      {isPurifying ? "Purificando…" : "Enviar a Validar"}
    </button>
  );
}
