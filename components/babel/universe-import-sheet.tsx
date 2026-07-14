"use client";

import { useBabel } from "@/components/babel/babel-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetHeader,
} from "@/components/ui/sheet";
import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import type { Campo } from "@/lib/projects/campos";
import type { CortexNode } from "@/lib/cortex/types";
import { fetchWithUniverse } from "@/lib/babel/universe-fetch";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ImportScope = "universe" | "campo" | "particula";

type UniverseImportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

export function UniverseImportSheet({
  open,
  onOpenChange,
  onImported,
}: UniverseImportSheetProps) {
  const { activeUniverse, universes } = useBabel();
  const [sourceSlug, setSourceSlug] = useState<string>(ROOT_UNIVERSE_SLUG);
  const [scope, setScope] = useState<ImportScope>("universe");
  const [scopeRef, setScopeRef] = useState("");
  const [campos, setCampos] = useState<Campo[]>([]);
  const [particulas, setParticulas] = useState<CortexNode[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const sourceUniverses = useMemo(
    () => universes.filter((universe) => universe.slug !== activeUniverse?.slug),
    [universes, activeUniverse?.slug],
  );

  useEffect(() => {
    if (!open || !sourceSlug) return;

    void (async () => {
      setIsLoadingOptions(true);
      try {
        const [camposResponse, cortexResponse] = await Promise.all([
          fetch(`/api/campos?universe=${encodeURIComponent(sourceSlug)}`, {
            cache: "no-store",
          }),
          fetchWithUniverse("/api/cortex", {
            universeSlug: sourceSlug,
            cache: "no-store",
          }),
        ]);

        if (camposResponse.ok) {
          const data = (await camposResponse.json()) as { campos?: Campo[] };
          setCampos(data.campos ?? []);
        } else {
          setCampos([]);
        }

        if (cortexResponse.ok) {
          const snapshot = (await cortexResponse.json()) as { nodes?: CortexNode[] };
          setParticulas(snapshot.nodes ?? []);
        } else {
          setParticulas([]);
        }
      } catch {
        setCampos([]);
        setParticulas([]);
      } finally {
        setIsLoadingOptions(false);
      }
    })();
  }, [open, sourceSlug]);

  useEffect(() => {
    if (!open) return;
    const defaultSource =
      sourceUniverses.find((universe) => universe.slug === ROOT_UNIVERSE_SLUG) ??
      sourceUniverses[0];
    if (defaultSource) {
      setSourceSlug(defaultSource.slug);
    }
    setScope("universe");
    setScopeRef("");
  }, [open, sourceUniverses]);

  const handleImport = useCallback(async () => {
    if (!activeUniverse || activeUniverse.isRoot) return;

    if (scope !== "universe" && !scopeRef.trim()) {
      toast.error("Seleccioná un campo o partícula para importar.");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch(
        `/api/universos/${encodeURIComponent(activeUniverse.slug)}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceSlug,
            scope,
            scopeRef: scope === "universe" ? undefined : scopeRef,
          }),
        },
      );

      const data = (await response.json()) as {
        imported?: number;
        skipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo importar el contenido.");
      }

      const imported = data.imported ?? 0;
      const skipped = data.skipped ?? 0;

      if (imported === 0 && skipped === 0) {
        toast.message("No hay contenido para importar con ese alcance.");
      } else {
        toast.success(
          imported > 0
            ? `Importados ${imported} enlace${imported === 1 ? "" : "s"} a ${activeUniverse.label}.`
            : `Todo el contenido seleccionado ya estaba importado (${skipped}).`,
        );
      }

      onImported();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo importar el contenido.",
      );
    } finally {
      setIsImporting(false);
    }
  }, [activeUniverse, onImported, onOpenChange, scope, scopeRef, sourceSlug]);

  if (!activeUniverse || activeUniverse.isRoot) {
    return null;
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-[min(100vw,28rem)]"
    >
      <SheetHeader
        title="Importar a universo"
        onClose={() => onOpenChange(false)}
      />
      <SheetBody>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copiá contenido de otro universo a{" "}
            <strong>{activeUniverse.label}</strong>. El origen conserva todo;
            aquí solo se crean enlaces de proyección.
          </p>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Universo origen
            </span>
            <select
              value={sourceSlug}
              onChange={(event) => {
                setSourceSlug(event.target.value);
                setScopeRef("");
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {sourceUniverses.map((universe) => (
                <option key={universe.slug} value={universe.slug}>
                  {universe.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Alcance
            </legend>
            {(
              [
                { id: "universe" as const, label: "Universo entero" },
                { id: "campo" as const, label: "Campo / sección" },
                { id: "particula" as const, label: "Partícula" },
              ] as const
            ).map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="import-scope"
                  value={item.id}
                  checked={scope === item.id}
                  onChange={() => {
                    setScope(item.id);
                    setScopeRef("");
                  }}
                />
                {item.label}
              </label>
            ))}
          </fieldset>

          {scope === "campo" && (
            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Campo
              </span>
              {isLoadingOptions ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Cargando campos…
                </p>
              ) : (
                <select
                  value={scopeRef}
                  onChange={(event) => setScopeRef(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seleccionar campo…</option>
                  {campos.map((campo) => (
                    <option key={campo.slug} value={campo.slug}>
                      {campo.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          {scope === "particula" && (
            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Partícula
              </span>
              {isLoadingOptions ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Cargando partículas…
                </p>
              ) : (
                <select
                  value={scopeRef}
                  onChange={(event) => setScopeRef(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seleccionar partícula…</option>
                  {particulas.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.titulo || node.particula || node.id}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={isImporting || sourceUniverses.length === 0}
            onClick={() => void handleImport()}
          >
            {isImporting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Importando…
              </>
            ) : (
              "Importar"
            )}
          </Button>
        </div>
      </SheetBody>
    </Sheet>
  );
}
