"use client";

import { AliasTagInput } from "@/components/personas/alias-tag-input";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/lib/personas/model";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
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
  aliases: [],
  notasGenerales: "",
};

export function personaToFormValues(persona: Persona): PersonaFormValues {
  return {
    nombrePrincipal: persona.nombrePrincipal,
    aliases: persona.aliases,
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
    aliases: initial?.aliases ?? [],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValues({
      ...EMPTY,
      ...initial,
      aliases: initial?.aliases ?? [],
    });
  }, [initial]);

  const handleSubmit = async () => {
    if (!values.nombrePrincipal.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit({
        nombrePrincipal: values.nombrePrincipal.trim(),
        aliases: values.aliases.map((alias) => alias.trim()).filter(Boolean),
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
          Nombre
        </span>
        <input
          value={values.nombrePrincipal}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              nombrePrincipal: event.target.value,
            }))
          }
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          required
        />
      </label>

      <fieldset className="space-y-1.5">
        <legend className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Aliases / Apodos
        </legend>
        <AliasTagInput
          aliases={values.aliases}
          onChange={(aliases) => setValues((prev) => ({ ...prev, aliases }))}
        />
      </fieldset>

      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Notas
        </span>
        <textarea
          value={values.notasGenerales}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              notasGenerales: event.target.value,
            }))
          }
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
