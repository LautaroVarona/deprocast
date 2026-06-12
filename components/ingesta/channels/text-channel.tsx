"use client";

import { useIngesta } from "@/components/ingesta/ingesta-context";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function TextChannel() {
  const { gravity, baseWeight, resetGravity } = useIngesta();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = content.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: gravity.title,
          source_type: gravity.sourceType,
          base_weight: baseWeight,
          content,
          field: gravity.campoSlug,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el documento");
      }

      toast.success(`Documento guardado: ${data.filename}`);
      setContent("");
      resetGravity();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el documento";
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
        placeholder="Pegá acá el chat completo, reporte o escrito..."
        className="min-h-0 flex-1 resize-none rounded-md border border-input bg-muted/30 px-3 py-2.5 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
      />
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
        <p className="font-mono text-[10px] text-muted-foreground">
          {content.trim().length > 0
            ? `${content.trim().length.toLocaleString("es-AR")} caracteres`
            : "Cola local · data/raw_documents/pending/"}
        </p>
        <Button type="button" size="sm" disabled={!canSave} onClick={() => void handleSave()}>
          {isSaving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {isSaving ? "Guardando..." : "Guardar localmente"}
        </Button>
      </div>
    </div>
  );
}
