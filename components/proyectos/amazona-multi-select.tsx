"use client";

import { MentionBadge } from "@/components/chat/mention-badge";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type AmazonAOption = {
  id: string;
  name: string;
  powerIds: string[];
};

type AmazonaMultiSelectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function AmazonaMultiSelect({
  selectedIds,
  onChange,
  disabled = false,
  className,
}: AmazonaMultiSelectProps) {
  const [resources, setResources] = useState<AmazonAOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/amazona", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error AmazonA");
      setResources(
        (data.resources ?? []).map(
          (r: { id: string; name: string; powerIds: string[] }) => ({
            id: r.id,
            name: r.name,
            powerIds: r.powerIds ?? [],
          }),
        ),
      );
    } catch {
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selected = resources.filter((r) => selectedSet.has(r.id));
  const available = resources.filter((r) => !selectedSet.has(r.id));

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((resource) => (
            <button
              key={resource.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(resource.id)}
              className="outline-none"
            >
              <MentionBadge
                label={resource.name}
                entityType="proyecto"
                onRemove={disabled ? undefined : () => toggle(resource.id)}
              />
            </button>
          ))}
        </div>
      )}

      <div className="max-h-36 overflow-y-auto rounded-lg border border-border">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Cargando arsenal…
          </div>
        ) : available.length === 0 && selected.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No hay recursos AmazonA en el inventario.
          </p>
        ) : available.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Todos los recursos seleccionados.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {available.map((resource) => (
              <li key={resource.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(resource.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 disabled:opacity-50"
                >
                  <span className="truncate">{resource.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {resource.powerIds.length}P
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
