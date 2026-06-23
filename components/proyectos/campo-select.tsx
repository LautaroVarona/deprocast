"use client";

import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/proyectos/form-controls";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  isCampoSlug,
  slugifyCampoInput,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type CampoSelectProps = {
  value: CampoSlug;
  onChange: (slug: CampoSlug) => void;
  campos?: CampoInfo[];
  allowCreate?: boolean;
  onCreateSlug?: (slug: CampoSlug) => void;
  className?: string;
  id?: string;
  label?: string;
  hint?: string;
};

export function CampoSelect({
  value,
  onChange,
  campos: camposProp,
  allowCreate = true,
  onCreateSlug,
  className,
  id = "campo-select",
  label = "Campo",
  hint,
}: CampoSelectProps) {
  const [campos, setCampos] = useState<CampoInfo[]>(camposProp ?? [getDefaultCampo()]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampoName, setNewCampoName] = useState("");

  useEffect(() => {
    if (camposProp) {
      setCampos(camposProp);
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/proyectos", { cache: "no-store" });
        if (!response.ok) return;
        const data: { campos?: CampoInfo[] } = await response.json();
        if (data.campos?.length) setCampos(data.campos);
      } catch {
        // Mantener default local
      }
    })();
  }, [camposProp]);

  const resolvedNewSlug = useMemo(() => {
    const slug = slugifyCampoInput(newCampoName);
    return isCampoSlug(slug) ? slug : "";
  }, [newCampoName]);

  const handleSelectChange = (selected: string) => {
    if (selected === "__new__") {
      setIsCreating(true);
      setNewCampoName("");
      return;
    }
    setIsCreating(false);
    onChange(selected);
  };

  const handleNewNameChange = (name: string) => {
    setNewCampoName(name);
    const slug = slugifyCampoInput(name);
    if (isCampoSlug(slug)) {
      onChange(slug);
      onCreateSlug?.(slug);
    }
  };

  const selectValue = isCreating ? "__new__" : value || DEFAULT_CAMPO_SLUG;

  return (
    <div className={cn("space-y-2", className)}>
      <FormField id={id} label={label} hint={hint}>
        <select
          id={id}
          value={selectValue}
          onChange={(event) => handleSelectChange(event.target.value)}
          className={inputClassName}
        >
          {campos.map((campo) => (
            <option key={campo.slug} value={campo.slug}>
              {campo.label}
              {campo.count > 0 ? ` (${campo.count})` : ""}
            </option>
          ))}
          {allowCreate && <option value="__new__">+ Crear nuevo Campo...</option>}
        </select>
      </FormField>

      {isCreating && allowCreate && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={newCampoName}
            onChange={(event) => handleNewNameChange(event.target.value)}
            placeholder="Ej: Salud, Creatividad, Aprendizaje..."
            className={inputClassName}
          />
          {resolvedNewSlug ? (
            <p className="text-xs text-muted-foreground">
              Slug: <span className="font-mono">{resolvedNewSlug}</span>
            </p>
          ) : (
            <p className="text-xs text-destructive">
              Ingresá un nombre válido para el nuevo Campo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}