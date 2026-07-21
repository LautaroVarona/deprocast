"use client";

import { Button } from "@/components/ui/button";
import type {
  MagoColeccionDetailDto,
  MagoColeccionDto,
  MagoColeccionKind,
  MagoRefKind,
} from "@/lib/mago/types";
import { cn } from "@/lib/utils";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ProjectOption = { id: string; title: string };

type MagoColeccionPanelProps = {
  colecciones: MagoColeccionDto[];
  selectedSlot: number | null;
  onChanged: () => void;
};

const KIND_OPTIONS: { value: MagoColeccionKind; label: string }[] = [
  { value: "generic", label: "Genérica" },
  { value: "proyectos", label: "Proyectos" },
  { value: "libro_rojo", label: "Libro Rojo" },
  { value: "capitulos", label: "Capítulos" },
];

export function MagoColeccionPanel({
  colecciones,
  selectedSlot,
  onChanged,
}: MagoColeccionPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    colecciones[0]?.id ?? null,
  );
  const [detail, setDetail] = useState<MagoColeccionDetailDto | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newNombre, setNewNombre] = useState("");
  const [newKind, setNewKind] = useState<MagoColeccionKind>("generic");

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/mago/colecciones/${id}`, { cache: "no-store" });
    const data = (await res.json()) as {
      coleccion?: MagoColeccionDetailDto;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "Error al cargar colección");
    setDetail(data.coleccion ?? null);
  }, []);

  useEffect(() => {
    if (colecciones.length === 0) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    if (!selectedId || !colecciones.some((c) => c.id === selectedId)) {
      setSelectedId(colecciones[0].id);
    }
  }, [colecciones, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Error");
    });
  }, [selectedId, loadDetail]);

  useEffect(() => {
    void fetch("/api/proyectos", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { projects?: { id: string; title: string }[] }) => {
        setProjects(
          (data.projects ?? []).map((p) => ({ id: p.id, title: p.title })),
        );
      })
      .catch(() => undefined);
  }, []);

  const createColeccion = async () => {
    if (!newNombre.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mago/colecciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newNombre, kind: newKind }),
      });
      const data = (await res.json()) as {
        coleccion?: MagoColeccionDetailDto;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear");
      setNewNombre("");
      setSelectedId(data.coleccion?.id ?? null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const patchItem = async (patch: {
    titulo?: string;
    contenido?: string;
    refKind?: MagoRefKind;
    refId?: string | null;
  }) => {
    if (!selectedId || selectedSlot === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mago/colecciones/${selectedId}/items/${selectedSlot}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const data = (await res.json()) as {
        coleccion?: MagoColeccionDetailDto;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setDetail(data.coleccion ?? null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const currentItem =
    detail?.items.find((item) => item.index === selectedSlot) ?? null;

  return (
    <aside className="flex w-full flex-col gap-4 border-t border-border bg-card/80 p-4 lg:w-80 lg:border-t-0 lg:border-l">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Colecciones 1–22
        </p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">Inyección</h2>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Nueva colección
          </span>
          <input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Ej: Proyectos activos"
            className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground outline-none"
          />
        </label>
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as MagoColeccionKind)}
          className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground outline-none"
        >
          {KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full border-accent/30 bg-accent/10 text-accent"
          disabled={busy || !newNombre.trim()}
          onClick={() => void createColeccion()}
        >
          <PlusIcon className="size-3.5" />
          Crear
        </Button>
      </div>

      {colecciones.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {colecciones.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => setSelectedId(col.id)}
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                selectedId === col.id
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border text-muted-foreground hover:text-muted-foreground",
              )}
            >
              {col.nombre}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Creá una colección de 22 slots para mapear dimensiones reales.
        </p>
      )}

      {selectedSlot !== null && detail ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
            Slot {selectedSlot} · {detail.nombre}
          </p>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              Título
            </span>
            <input
              key={`titulo-${selectedSlot}-${currentItem?.id ?? "new"}`}
              defaultValue={currentItem?.titulo ?? ""}
              onBlur={(e) => {
                const value = e.target.value;
                if (value !== (currentItem?.titulo ?? "")) {
                  void patchItem({ titulo: value });
                }
              }}
              className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>
          {(detail.kind === "libro_rojo" || detail.kind === "generic") && (
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                Contenido
              </span>
              <textarea
                key={`contenido-${selectedSlot}-${currentItem?.id ?? "new"}`}
                defaultValue={currentItem?.contenido ?? ""}
                rows={3}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value !== (currentItem?.contenido ?? "")) {
                    void patchItem({ contenido: value });
                  }
                }}
                className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
          )}
          {(detail.kind === "proyectos" || detail.kind === "generic") && (
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                Proyecto Deprocast
              </span>
              <select
                value={
                  currentItem?.refKind === "project"
                    ? (currentItem.refId ?? "")
                    : ""
                }
                onChange={(e) => {
                  const refId = e.target.value || null;
                  void patchItem({
                    refKind: refId ? "project" : "none",
                    refId,
                    titulo:
                      refId && !currentItem?.titulo
                        ? (projects.find((p) => p.id === refId)?.title ?? "")
                        : undefined,
                  });
                }}
                className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="">Sin vincular</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Seleccioná una tarjeta de nivel para editar su slot.
        </p>
      )}
    </aside>
  );
}
