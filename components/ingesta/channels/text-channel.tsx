"use client";

import {
  buildCaptureGravity,
  postIngestaCapture,
} from "@/components/ingesta/capture-client";
import { useIngesta } from "@/components/ingesta/ingesta-context";
import { Button } from "@/components/ui/button";
import { CAPTURE_SUCCESS_TOAST } from "@/lib/purifier/constants";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function TextChannel() {
  const { gravity, resetGravity } = useIngesta();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = content.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const data = await postIngestaCapture({
        channel: "texto",
        rawText: content,
        gravity: buildCaptureGravity(gravity),
      });

      toast.success(CAPTURE_SUCCESS_TOAST, {
        description: "El sistema está estructurando el contenido.",
        action: {
          label: "Validar →",
          onClick: () => {
            window.location.href = `/validar?id=${data.reviewId}`;
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
            : "Soltá o pegá prima materia · purificación automática"}
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
          {isSaving ? "Purificando…" : "Ingestar"}
        </Button>
      </div>
    </div>
  );
}
