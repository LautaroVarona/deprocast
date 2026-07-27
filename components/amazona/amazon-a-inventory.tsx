"use client";

import type { AmazonAResourceDto } from "@/lib/amazona/types";
import { POWERS_72 } from "@/lib/mago/powers";
import { notifyDomainRefresh } from "@/lib/domain-refresh";
import { cn } from "@/lib/utils";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type AmazonAInventoryProps = {
  skin?: "noir" | "ludus";
  selectedResourceId?: string | null;
  onSelectResource?: (resource: AmazonAResourceDto | null) => void;
  className?: string;
};

export function AmazonAInventory({
  skin = "noir",
  selectedResourceId,
  onSelectResource,
  className,
}: AmazonAInventoryProps) {
  const [resources, setResources] = useState<AmazonAResourceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [powerId, setPowerId] = useState(POWERS_72[0]?.id ?? "P01");
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/amazona", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar AmazonA.");
      const data = (await response.json()) as {
        resources?: AmazonAResourceDto[];
      };
      setResources(data.resources ?? []);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.message("Indicá un nombre para el recurso.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/amazona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: "",
          powerIds: [powerId],
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        resource?: AmazonAResourceDto;
      };
      if (!response.ok) throw new Error(data.error ?? "Alta fallida.");
      notifyDomainRefresh("all", "amazona-create");
      setName("");
      setShowForm(false);
      await refresh();
      if (data.resource) onSelectResource?.(data.resource);
      toast.success(`AmazonA · ${trimmed} coagulado en el grafo.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el recurso.",
      );
    } finally {
      setCreating(false);
    }
  }, [name, powerId, refresh, onSelectResource]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/amazona/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "No se pudo borrar.");
        }
        notifyDomainRefresh("kg", "amazona-delete");
        if (selectedResourceId === id) onSelectResource?.(null);
        await refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al borrar.",
        );
      }
    },
    [refresh, selectedResourceId, onSelectResource],
  );

  const panelClass =
    skin === "noir"
      ? "calendario-noir-panel border-border"
      : "border-border bg-card/80";

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col rounded-xl border lg:w-64",
        panelClass,
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
            Lista AmazonA
          </p>
          <p className="text-[11px] text-muted-foreground">
            Recursos · 72 Poderes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Alta recurso"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </header>

      {showForm ? (
        <div className="space-y-2 border-b border-border p-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del recurso"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
          />
          <select
            value={powerId}
            onChange={(e) => setPowerId(e.target.value as typeof powerId)}
            className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[10px]"
          >
            {POWERS_72.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreate()}
            className="w-full rounded bg-primary/20 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/30 disabled:opacity-50"
          >
            {creating ? "Coagulando…" : "Dar de alta"}
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin" />
            Inventario…
          </div>
        ) : resources.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            Sin recursos. Alta manual = nodo reconocido en el grafo.
          </p>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("kind", "amazona_resource");
                event.dataTransfer.setData("id", resource.id);
                event.dataTransfer.setData("label", resource.name);
              }}
              onClick={() => onSelectResource?.(resource)}
              className={cn(
                "w-full cursor-grab rounded-md border border-border bg-card/50 px-2.5 py-2 text-left text-xs transition-all hover:border-primary/40 active:cursor-grabbing",
                selectedResourceId === resource.id && "ring-2 ring-primary/60",
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="line-clamp-2 font-medium text-foreground">
                  {resource.name}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(resource.id);
                  }}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Eliminar"
                >
                  <Trash2Icon className="size-3" />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {resource.powerIds.map((pid) => (
                  <span
                    key={pid}
                    className="rounded bg-primary/15 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary"
                  >
                    {pid}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
