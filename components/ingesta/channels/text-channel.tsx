"use client";

import {
  buildCaptureGravity,
  postIngestaCapture,
} from "@/components/ingesta/capture-client";
import { useBabel } from "@/components/babel/babel-context";
import { useIngesta } from "@/components/ingesta/ingesta-context";
import { Button } from "@/components/ui/button";
import {
  CAPTURE_QUEUED_TOAST,
  CAPTURE_SUCCESS_TOAST,
} from "@/lib/purifier/constants";
import { buildValidarAduanaHref } from "@/lib/navigation/resolve-href";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function TextChannel() {
  const { gravity, resetGravity } = useIngesta();
  const { activeUniverse } = useBabel();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = content.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const data = await postIngestaCapture(
        {
          channel: "texto",
          rawText: content,
          gravity: buildCaptureGravity(gravity, activeUniverse?.slug),
        },
        { universeSlug: activeUniverse?.slug },
      );

      const queued = data.queued !== false;
      const validarHref = buildValidarAduanaHref(data.reviewId);
      toast.success(queued ? CAPTURE_QUEUED_TOAST : CAPTURE_SUCCESS_TOAST, {
        duration: 12_000,
        description: queued
          ? `Capturado en la Aduana (/validar), no en el Altar de audio. En cola (id ${data.reviewId.slice(0, 8)}…).`
          : `Capturado en la Aduana (/validar), no en el Altar de audio. Id ${data.reviewId.slice(0, 8)}…`,
        action: {
          label: "Ir a Validar →",
          onClick: () => {
            window.location.href = validarHref;
          },
        },
      });
      setContent("");
      resetGravity();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo capturar la prima materia";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Pegá acá el chat completo, reporte o escrito…"
        className="min-h-0 flex-1 resize-none rounded-md border border-input bg-muted/30 px-3 py-2.5 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
      />
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
        <p className="font-mono text-[10px] text-muted-foreground">
          {content.trim().length > 0
            ? `${content.trim().length.toLocaleString("es-AR")} caracteres`
            : "Soltá o pegá prima materia · cola de purificación"}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          {isSaving ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <SparklesIcon />
          )}
          {isSaving ? "Capturando…" : "Ingestar"}
        </Button>
      </div>
    </div>
  );
}
