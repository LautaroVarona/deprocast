"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetFooter,
  SheetHeader,
} from "@/components/ui/sheet";
import type { PersonaDetailDto } from "@/lib/personas/types";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AddPersonaSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (persona: PersonaDetailDto) => void;
};

export function AddPersonaSheet({
  open,
  onOpenChange,
  onCreated,
}: AddPersonaSheetProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setName("");
    setRole("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Ingresá un nombre.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear la persona.");
      }

      toast.success(`${data.persona.primaryName} indexada en el CRM de contexto.`);
      onCreated(data.persona);
      reset();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la persona.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title="Añadir persona"
        description="Modo simple — nombre y rol de contexto."
        onClose={() => onOpenChange(false)}
      />
      <SheetBody className="space-y-4">
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Nombre completo
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Ignacio Varona"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            autoFocus
          />
        </label>
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Rol / contexto
          </span>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Ej. Trabajo/Varona, Personal, Audiovisual"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Si el Purifier o el NER ya detectaron un alias equivalente, la identidad
          se unificará automáticamente sin duplicar nodos.
        </p>
      </SheetBody>
      <SheetFooter>
        <Button
          type="button"
          className="w-full"
          disabled={isSaving}
          onClick={() => void handleSubmit()}
        >
          {isSaving ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <UserPlusIcon />
          )}
          Indexar persona
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
