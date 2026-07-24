"use client";

import { completePrimaMissionAction } from "@/app/yo/actions";
import { Sheet, SheetBody, SheetHeader } from "@/components/ui/sheet";
import type { YoDto } from "@/lib/yo/types";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MissionProjectOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (yo: YoDto) => void;
};

export function MissionProjectOverlay({
  open,
  onOpenChange,
  onCompleted,
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
      const result = await completePrimaMissionAction({
        title: trimmed,
        why: horizon.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.data.genesisStatus === "COMPLETED"
          ? "Génesis completa. El exoesqueleto está libre."
          : "Prima Materia inyectada en el Atanor.",
      );
      onCompleted(result.data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title="Prima Materia · Primer fuego"
        description="Inyectá tu gran objetivo a 90 días. Al sellarlo, liberás la app."
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

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none placeholder:text-legion-bone/35 focus:border-legion-bronze"
            required
            autoFocus
            placeholder="Objetivo a 90 días"
            aria-label="Objetivo a 90 días"
          />

          <textarea
            value={horizon}
            onChange={(event) => setHorizon(event.target.value)}
            rows={3}
            className="w-full resize-none border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none placeholder:text-legion-bone/35 focus:border-legion-bronze"
            placeholder="Por qué importa (opcional)"
            aria-label="Por qué importa"
          />

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="genesis-btn flex min-h-11 w-full items-center justify-center gap-2 px-4 font-display text-sm tracking-[0.14em] uppercase disabled:opacity-50"
          >
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Finalizar Misión
          </button>
        </form>
      </SheetBody>
    </Sheet>
  );
}
