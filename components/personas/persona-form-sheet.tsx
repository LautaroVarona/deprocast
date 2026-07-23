"use client";

import {
  PersonaForm,
  type PersonaFormValues,
  personaToFormValues,
} from "@/components/personas/persona-form";
import {
  Sheet,
  SheetBody,
  SheetHeader,
} from "@/components/ui/sheet";
import type { Persona } from "@/lib/personas/model";
import { toast } from "sonner";

type PersonaFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPersona: Persona;
  onSaved: (persona: Persona) => void;
};

/** Sheet de edición. El alta vive en `NuevaPersonaSidebar`. */
export function PersonaFormSheet({
  open,
  onOpenChange,
  initialPersona,
  onSaved,
}: PersonaFormSheetProps) {
  const handleSubmit = async (values: PersonaFormValues) => {
    try {
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
        title="Editar persona"
        description={initialPersona.nombrePrincipal}
        onClose={() => onOpenChange(false)}
      />
      <SheetBody>
        <PersonaForm
          key={initialPersona.id}
          initial={personaToFormValues(initialPersona)}
          submitLabel="Guardar cambios"
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetBody>
    </Sheet>
  );
}
