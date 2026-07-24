"use client";

import { Sheet, SheetBody, SheetHeader } from "@/components/ui/sheet";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MissionProjectOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function MissionProjectOverlay({
  open,
  onOpenChange,
  onCreated,
}: MissionProjectOverlayProps) {
  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setHorizon("");
    setSaving(false);
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      const description = horizon.trim()
        ? `Horizonte 90 días: ${horizon.trim()}`
        : "Primer fuego · Consagración Prima Materia.";

      const response = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick",
          title: trimmed,
          description,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo inyectar el objetivo.");
      }

      toast.success("Prima Materia inyectada en el Atanor.");
      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo inyectar el objetivo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title="Prima Materia · Primer fuego"
        description="Inyectá tu gran objetivo a 90 días. El Atanor lo purificará en asaltos."
        onClose={() => onOpenChange(false)}
      />
      <SheetBody>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <p className="font-mono text-[11px] leading-relaxed text-legion-bronze/90">
            Este es el mismo gesto de captura rápida del Atanor. Aprendé el
            ritual ahora.
          </p>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Objetivo a 90 días
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none focus:border-legion-bronze"
              required
              autoFocus
              placeholder="Ej. Cerrar el MVP del Exocórtex"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Por qué importa (opcional)
            </span>
            <textarea
              value={horizon}
              onChange={(event) => setHorizon(event.target.value)}
              rows={3}
              className="w-full resize-none border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none focus:border-legion-bronze"
              placeholder="Señal de victoria, restricción, o coste de no hacerlo."
            />
          </label>

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="genesis-btn flex min-h-11 w-full items-center justify-center gap-2 px-4 font-display text-sm tracking-[0.14em] uppercase disabled:opacity-50"
          >
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Inyectar en el Atanor
          </button>
        </form>
      </SheetBody>
    </Sheet>
  );
}
