"use client";

import { Button } from "@/components/ui/button";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/proyectos/form-controls";
import { isCampoSlug, slugifyCampoInput, type Campo } from "@/lib/projects/campos";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CampoFormProps = {
  campo?: Campo | null;
  onSaved: () => void;
  onCancel?: () => void;
};

export function CampoForm({ campo, onSaved, onCancel }: CampoFormProps) {
  const isEditing = Boolean(campo);
  const [label, setLabel] = useState(campo?.label ?? "");
  const [description, setDescription] = useState(campo?.description ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLabel(campo?.label ?? "");
    setDescription(campo?.description ?? "");
  }, [campo]);

  const previewSlug = useMemo(() => {
    if (isEditing) return campo?.slug ?? "";
    return slugifyCampoInput(label);
  }, [isEditing, campo?.slug, label]);

  const canSubmit = label.trim().length > 0 && (isEditing || isCampoSlug(previewSlug));

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      if (isEditing && campo) {
        const response = await fetch(`/api/campos/${campo.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: label.trim(), description: description.trim() }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo actualizar el Campo.");
        }
        toast.success("Campo actualizado.");
      } else {
        const response = await fetch("/api/campos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: label.trim(), description: description.trim() }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo crear el Campo.");
        }
        toast.success("Campo creado.");
        setLabel("");
        setDescription("");
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar el Campo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
      <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        {isEditing ? "Editar Campo" : "Nuevo Campo"}
      </p>

      <FormField id="campo-label" label="Nombre">
        <input
          id="campo-label"
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ej. Producción Audiovisual"
          className={inputClassName}
          disabled={isEditing && campo?.slug === "babel"}
        />
      </FormField>

      {!isEditing && previewSlug && (
        <p className="font-mono text-[10px] text-muted-foreground">
          Slug: <span className="text-foreground">{previewSlug}</span>
        </p>
      )}

      <FormField
        id="campo-description"
        label="Descripción"
        hint="(área de responsabilidad continua)"
      >
        <textarea
          id="campo-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="¿Qué ámbito cubre este Campo?"
          rows={3}
          className={textareaClassName}
        />
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!canSubmit || isSaving} onClick={() => void handleSubmit()}>
          {isSaving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear Campo"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
