"use client";

import {
  Sheet,
  SheetBody,
  SheetHeader,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { PersonaCardDto } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import { Loader2Icon, MergeIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type PersonaMergeSheetProps = {
  open: boolean;
  candidate: PersonaCardDto | null;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
};

export function PersonaMergeSheet({
  open,
  candidate,
  onOpenChange,
  onMerged,
}: PersonaMergeSheetProps) {
  const [targets, setTargets] = useState<PersonaCardDto[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedId(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      try {
        const [verifiedRes, allRes] = await Promise.all([
          fetch("/api/personas?status=verified", { cache: "no-store" }),
          fetch("/api/personas?status=all", { cache: "no-store" }),
        ]);
        const verifiedData = await verifiedRes.json().catch(() => ({}));
        const allData = await allRes.json().catch(() => ({}));
        const verified = (verifiedData.personas ?? []) as PersonaCardDto[];
        const all = (allData.personas ?? []) as PersonaCardDto[];
        const byId = new Map<string, PersonaCardDto>();
        for (const persona of [...verified, ...all]) {
          byId.set(persona.id, persona);
        }
        if (!cancelled) {
          setTargets(
            [...byId.values()].filter(
              (persona) => persona.id !== candidate?.id,
            ),
          );
        }
      } catch {
        if (!cancelled) setTargets([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, candidate?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets.slice(0, 40);
    return targets
      .filter(
        (persona) =>
          persona.primaryName.toLowerCase().includes(q) ||
          persona.aliases.some((alias) => alias.toLowerCase().includes(q)),
      )
      .slice(0, 40);
  }, [targets, query]);

  const selected = targets.find((persona) => persona.id === selectedId) ?? null;

  const handleMerge = async () => {
    if (!candidate || !selectedId) return;
    setIsMerging(true);
    try {
      const response = await fetch("/api/personas/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepId: selectedId,
          dropId: candidate.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo fusionar.");
      }
      toast.success(
        `«${candidate.primaryName}» absorbida en «${data.persona.nombrePrincipal}».`,
        {
          description: `${data.movedMentions} menciones · ${data.mergedAliases} aliases`,
        },
      );
      onMerged();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al fusionar.",
      );
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title="Fusionar identidad"
        description={
          candidate
            ? `«${candidate.primaryName}» es un alias / OCR de otra persona canónica.`
            : undefined
        }
        onClose={() => onOpenChange(false)}
      />
      <SheetBody className="flex flex-col gap-4">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar persona canónica…"
            className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {isLoading ? (
            <p className="flex items-center justify-center gap-2 py-8 font-mono text-[10px] text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              Cargando identidades…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay candidatos de fusión.
            </p>
          ) : (
            filtered.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => setSelectedId(persona.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors",
                  selectedId === persona.id
                    ? "bg-emerald-500/15 ring-1 ring-emerald-500/40"
                    : "hover:bg-muted",
                )}
              >
                <span className="text-sm font-medium">{persona.primaryName}</span>
                {persona.aliases.length > 0 ? (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {persona.aliases.slice(0, 3).join(" · ")}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>

        {selected ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Se reasignarán menciones y aristas de{" "}
            <strong className="text-foreground">{candidate?.primaryName}</strong>{" "}
            hacia <strong className="text-foreground">{selected.primaryName}</strong>{" "}
            y se eliminará el nodo duplicado.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isMerging}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleMerge()}
            disabled={!selectedId || isMerging}
          >
            {isMerging ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <MergeIcon className="size-4" />
            )}
            Fusionar
          </Button>
        </div>
      </SheetBody>
    </Sheet>
  );
}
