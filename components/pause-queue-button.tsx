"use client";

import { Button } from "@/components/ui/button";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PauseQueueButtonProps = {
  paused: boolean;
  /** Mostrar aunque no haya job activo (p. ej. cola con PENDING). */
  visible?: boolean;
  onToggled?: () => void;
  size?: "sm" | "default";
  className?: string;
};

export function PauseQueueButton({
  paused,
  visible = true,
  onToggled,
  size = "sm",
  className,
}: PauseQueueButtonProps) {
  const [isBusy, setIsBusy] = useState(false);

  if (!visible) return null;

  async function handleToggle() {
    setIsBusy(true);
    const action = paused ? "resume" : "pause";

    try {
      const response = await fetch("/api/process/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        paused?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cambiar la pausa de la cola");
      }

      toast.success(data.message ?? (paused ? "Reanudado" : "Pausado"));
      onToggled?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la pausa de la cola";
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Button
      size={size}
      variant={paused ? "default" : "outline"}
      onClick={() => void handleToggle()}
      disabled={isBusy}
      className={className}
    >
      {paused ? (
        <PlayIcon className="size-3.5" />
      ) : (
        <PauseIcon className="size-3.5" />
      )}
      {isBusy
        ? paused
          ? "Reanudando..."
          : "Pausando..."
        : paused
          ? "Reanudar envíos"
          : "Pausar envíos"}
    </Button>
  );
}
