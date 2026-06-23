"use client";

import { Button } from "@/components/ui/button";
import type { Persona } from "@/lib/personas/model";
import { cn } from "@/lib/utils";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

export type PersonaFormValues = {
  nombrePrincipal: string;
  aliases: string[];
  notasGenerales: string;
};

type PersonaFormProps = {
  initial?: Partial<PersonaFormValues>;
  submitLabel: string;
  onSubmit: (values: PersonaFormValues) => Promise<void>;
  onCancel?: () => void;
  className?: string;
};

const EMPTY: PersonaFormValues = {
  nombrePrincipal: "",
  aliases: [""],
  notasGenerales: "",
};

export function personaToFormValues(persona: Persona): PersonaFormValues {
  return {
    nombrePrincipal: persona.nombrePrincipal,
    aliases: persona.aliases.length > 0 ? persona.aliases : [""],
    notasGenerales: persona.notasGenerales,
  };
}

export function PersonaForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  className,
}: PersonaFormProps) {
  const [values, setValues] = useState<PersonaFormValues>({
    ...EMPTY,
    ...initial,
    aliases: initial?.aliases?.length ? initial.aliases : [""],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValues({
      ...EMPTY,
      ...initial,
      aliases: initial?.aliases?.length ? initial.aliases : [""],
    });
  }, [initial]);

  const updateAlias = (index: number, value: string) => {
    setValues((prev) => {
      const aliases = [...prev.aliases];
      aliases[index] = value;
      return { ...prev, aliases };
    });
  };

  const addAlias = () => {
    setValues((prev) => ({ ...prev, aliases: [...prev.aliases, ""] }));
  };

  const removeAlias = (index: number) => {
    setValues((prev) => ({
      ...prev,
      aliases: prev.aliases.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!values.nombrePrincipal.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit({
        nombrePrincipal: values.nombrePrincipal.trim(),
        aliases: values.aliases.map((a) => a.trim()).filter(Boolean),
        notasGenerales: values.notasGenerales,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className={cn("space-y-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Nombre principal
        </span>
        <input
          value={values.nombrePrincipal}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              nombrePrincipal: event.target.value,
            }))
          }
          placeholder="Ej. Ignacio Varona"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          required
        />
      </label>

      <fieldset className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <legend className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Aliases / apodos
          </legend>
          <Button type="button" variant="outline" size="xs" onClick={addAlias}>
            <PlusIcon />
            Alias
          </Button>
        </div>
        <div className="space-y-2">
          {values.aliases.map((alias, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={alias}
                onChange={(event) => updateAlias(index, event.target.value)}
                placeholder="Ej. Nacho"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {values.aliases.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeAlias(index)}
                  aria-label="Eliminar alias"
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Notas generales
        </span>
        <textarea
          value={values.notasGenerales}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              notasGenerales: event.target.value,
            }))
          }
          placeholder="Contexto libre, preferencias, vínculos relevantes…"
          rows={4}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSaving || !values.nombrePrincipal.trim()}
        >
          {isSaving && <Loader2Icon className="animate-spin" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
