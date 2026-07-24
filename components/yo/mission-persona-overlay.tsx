"use client";

import { createPersonaAction } from "@/app/personas/actions";
import { Sheet, SheetBody, SheetHeader } from "@/components/ui/sheet";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MissionPersonaOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  progress: number;
  target: number;
};

export function MissionPersonaOverlay({
  open,
  onOpenChange,
  onCreated,
  progress,
  target,
}: MissionPersonaOverlayProps) {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre("");
    setRol("");
    setSaving(false);
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = nombre.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      const result = await createPersonaAction({
        nombrePrincipal: trimmed,
        aliases: [],
        notasGenerales: rol.trim()
          ? `Rol / vínculo: ${rol.trim()}`
          : "Registrada durante Consagración · El Senado.",
        connections: [],
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`${result.data.nombrePrincipal} indexada en el Senado.`);
      onCreated();
      setNombre("");
      setRol("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title="El Senado · Alta de entidad"
        description={`${progress}/${target} aliados registrados. Nombre y rol bastan.`}
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
            El Exocórtex requiere conocer a tus aliados. Este es el mismo
            registro que usarás en Nodos.
          </p>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Nombre
            </span>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="w-full border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none focus:border-legion-bronze"
              required
              autoFocus
              placeholder="Ej. Marcia"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Rol / vínculo (opcional)
            </span>
            <input
              value={rol}
              onChange={(event) => setRol(event.target.value)}
              className="w-full border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none focus:border-legion-bronze"
              placeholder="Ej. Socio estratégico / Mentor"
            />
          </label>

          <button
            type="submit"
            disabled={saving || !nombre.trim()}
            className="genesis-btn flex min-h-11 w-full items-center justify-center gap-2 px-4 font-display text-sm tracking-[0.14em] uppercase disabled:opacity-50"
          >
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Registrar entidad
          </button>
        </form>
      </SheetBody>
    </Sheet>
  );
}
