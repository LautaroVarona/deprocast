"use client";

import {
  PersonaForm,
  type PersonaFormValues,
} from "@/components/personas/persona-form";
import {
  Sheet,
  SheetBody,
  SheetHeader,
} from "@/components/ui/sheet";
import type { Persona } from "@/lib/personas/model";
import { personaToFormValues } from "@/components/personas/persona-form";
import { toast } from "sonner";

type PersonaFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialPersona?: Persona | null;
  onSaved: (persona: Persona) => void;
};

export function PersonaFormSheet({
  open,
  onOpenChange,
  mode,
  initialPersona,
  onSaved,
}: PersonaFormSheetProps) {
  const handleSubmit = async (values: PersonaFormValues) => {
    try {
      if (mode === "create") {
        const response = await fetch("/api/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombrePrincipal: values.nombrePrincipal,
            aliases: values.aliases,
            notasGenerales: values.notasGenerales,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo crear la persona.");
        }
        toast.success(`${data.persona.nombrePrincipal} indexada.`);
        onSaved(data.persona as Persona);
        onOpenChange(false);
        return;
      }

      if (!initialPersona) return;

      const response = await fetch(
        `/api/personas/${encodeURIComponent(initialPersona.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar la persona.");
      }
      toast.success("Persona actualizada.");
      onSaved(data.persona as Persona);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al guardar la persona.";
      toast.error(message);
      throw error;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title={mode === "create" ? "Nueva persona" : "Editar persona"}
        description={
          mode === "create"
            ? "Alta manual con aliases dinámicos."
            : initialPersona?.nombrePrincipal
        }
        onClose={() => onOpenChange(false)}
      />
      <SheetBody>
        <PersonaForm
          key={initialPersona?.id ?? "create"}
          initial={
            mode === "edit" && initialPersona
              ? personaToFormValues(initialPersona)
              : undefined
          }
          submitLabel={mode === "create" ? "Crear persona" : "Guardar cambios"}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetBody>
    </Sheet>
  );
}
