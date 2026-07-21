"use client";

import { MentionBadge } from "@/components/chat/mention-badge";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  isCampoSlug,
  normalizeCampoSlugs,
  slugifyCampoInput,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import { cn } from "@/lib/utils";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CampoMultiSelectProps = {
  id?: string;
  selected: CampoSlug[];
  onChange: (slugs: CampoSlug[]) => void;
  campos: CampoInfo[];
  onCamposChange?: (campos: CampoInfo[]) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function CampoMultiSelect({
  id,
  selected,
  onChange,
  campos,
  onCamposChange,
  disabled = false,
  compact = false,
  className,
}: CampoMultiSelectProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCampoName, setNewCampoName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const available = useMemo(
    () => campos.filter((campo) => !selected.includes(campo.slug)),
    [campos, selected],
  );

  const resolvedNewSlug = useMemo(() => {
    const slug = slugifyCampoInput(newCampoName);
    return isCampoSlug(slug) ? slug : "";
  }, [newCampoName]);

  const addCampo = (slug: CampoSlug) => {
    if (selected.includes(slug)) return;

    let next = [...selected, slug];
    if (
      selected.length === 1 &&
      selected[0] === DEFAULT_CAMPO_SLUG &&
      slug !== DEFAULT_CAMPO_SLUG
    ) {
      next = [slug];
    }

    onChange(normalizeCampoSlugs(next));
  };

  const removeCampo = (slug: CampoSlug) => {
    const next = selected.filter((item) => item !== slug);
    onChange(normalizeCampoSlugs(next.length > 0 ? next : [DEFAULT_CAMPO_SLUG]));
  };

  const handleCreate = async () => {
    const label = newCampoName.trim();
    if (!label || !resolvedNewSlug || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/campos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el campo.");
      }

      const created: CampoInfo = {
        slug: data.campo.slug,
        label: data.campo.label,
        count: 0,
        description: data.campo.description,
      };

      onCamposChange?.([...campos.filter((c) => c.slug !== created.slug), created]);
      addCampo(created.slug);
      setNewCampoName("");
      setIsCreating(false);
      toast.success(`Campo "${created.label}" creado.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el campo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLabels = selected.map(
    (slug) => campos.find((c) => c.slug === slug) ?? getDefaultCampo(),
  );

  const badgeClass = compact ? "h-5 text-[10px] px-1" : undefined;
  const controlClass = compact
    ? "h-6 rounded border border-input bg-background px-1.5 font-mono text-[10px]"
    : "h-8 rounded-md border border-input bg-background px-2 font-mono text-[10px]";

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-2", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1",
          compact
            ? "min-h-6 rounded border border-input/70 px-1"
            : "min-h-9 rounded-lg border border-input bg-background px-2 py-1.5",
          disabled && "opacity-60",
        )}
      >
        {selectedLabels.map((campo) => (
          <MentionBadge
            key={campo.slug}
            label={campo.label}
            entityType="campo"
            className={badgeClass}
            onRemove={disabled ? undefined : () => removeCampo(campo.slug)}
          />
        ))}

        {!disabled && (
          <>
            <select
              id={id}
              value=""
              onChange={(event) => {
                const slug = event.target.value;
                if (slug && isCampoSlug(slug)) addCampo(slug);
              }}
              className={cn(controlClass, compact ? "max-w-[7rem] flex-1" : "min-w-0 flex-1")}
            >
              <option value="">+ campo</option>
              {available.map((campo) => (
                <option key={campo.slug} value={campo.slug}>
                  {campo.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsCreating((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded border border-border text-muted-foreground hover:bg-muted/60",
                compact ? "h-6 px-1.5 text-[10px]" : "h-8 px-2 text-[10px]",
              )}
            >
              <PlusIcon className={compact ? "size-2.5" : "size-3"} />
              {compact ? null : "Nuevo"}
            </button>
          </>
        )}

        {selected.length === 0 && disabled && (
          <span className="font-mono text-[10px] text-muted-foreground">—</span>
        )}
      </div>

      {isCreating && !disabled && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newCampoName}
            onChange={(e) => setNewCampoName(e.target.value)}
            placeholder="Nuevo campo…"
            className={cn(controlClass, "min-w-0 flex-1")}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <button
            type="button"
            disabled={!resolvedNewSlug || isSaving}
            onClick={() => void handleCreate()}
            className={cn(
              "inline-flex shrink-0 items-center rounded bg-primary font-medium text-primary-foreground disabled:opacity-50",
              compact ? "h-6 px-2 text-[10px]" : "h-8 px-2.5 text-[10px]",
            )}
          >
            {isSaving ? <Loader2Icon className="size-2.5 animate-spin" /> : "OK"}
          </button>
        </div>
      )}
    </div>
  );
}
