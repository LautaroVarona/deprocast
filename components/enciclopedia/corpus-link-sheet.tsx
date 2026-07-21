"use client";

import { useBabel } from "@/components/babel/babel-context";
import { useEnciclopedia } from "@/components/enciclopedia/enciclopedia-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetFooter,
  SheetHeader,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LinkIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type KgNodeResult = {
  id: string;
  primaryName: string;
  type: string;
};

const NODE_TYPES = [
  { value: "proyecto", label: "Proyecto" },
  { value: "persona", label: "Persona" },
  { value: "area", label: "Área" },
  { value: "concepto", label: "Concepto" },
] as const;

const RELATION_OPTIONS = [
  { value: "relacionado_con", label: "Relacionado con" },
  { value: "define", label: "Define" },
  { value: "relevante_para", label: "Relevante para" },
  { value: "menciona_a", label: "Menciona a" },
  { value: "documenta", label: "Documenta" },
] as const;

type CorpusLinkSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CorpusLinkSheet({ open, onOpenChange }: CorpusLinkSheetProps) {
  const { currentEntry, linkToCorpus, isBusy } = useEnciclopedia();
  const { universeFetch } = useBabel();
  const [nodeType, setNodeType] =
    useState<(typeof NODE_TYPES)[number]["value"]>("proyecto");
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<KgNodeResult[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<KgNodeResult | null>(
    null,
  );
  const [relationType, setRelationType] = useState("relacionado_con");
  const [context, setContext] = useState("");
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    setQuery("");
    setTargets([]);
    setSelectedTarget(null);
    setRelationType("relacionado_con");
    setContext("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const loadTargets = useCallback(async () => {
    setIsLoadingTargets(true);
    try {
      const params = new URLSearchParams({ type: nodeType, limit: "20" });
      if (query.trim()) params.set("q", query.trim());

      const response = await universeFetch(`/api/kg/nodes?${params}`);
      const payload = (await response.json()) as {
        nodes?: KgNodeResult[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron buscar nodos.");
      }

      setTargets(payload.nodes ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al buscar en el Corpus.",
      );
    } finally {
      setIsLoadingTargets(false);
    }
  }, [nodeType, query, universeFetch]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadTargets();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, loadTargets]);

  async function handleSave() {
    if (!currentEntry || !selectedTarget) return;

    setIsSaving(true);
    try {
      await linkToCorpus([
        {
          nodeId: selectedTarget.id,
          relationType,
          context: context.trim() || undefined,
        },
      ]);
      toast.success("Entrada vinculada al Corpus.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo vincular.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title="Vincular al Corpus"
        description={
          currentEntry
            ? `Conectá «${currentEntry.title}» con proyectos, personas, áreas o conceptos de Deprocast.`
            : "Seleccioná una entrada primero."
        }
        onClose={() => onOpenChange(false)}
      />
      <SheetBody className="space-y-4">
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Tipo de entidad
          </label>
          <div className="flex flex-wrap gap-2">
            {NODE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setNodeType(type.value);
                  setSelectedTarget(null);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                  nodeType === type.value
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-border",
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Buscar en el Corpus
          </label>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre del nodo…"
            className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-muted-foreground outline-none focus:border-accent/40"
          />
        </div>

        <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {isLoadingTargets ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
            </div>
          ) : targets.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Sin resultados.
            </p>
          ) : (
            targets.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => setSelectedTarget(target)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition",
                  selectedTarget?.id === target.id
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span>{target.primaryName}</span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  {target.type}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Tipo de relación
          </label>
          <select
            value={relationType}
            onChange={(event) => setRelationType(event.target.value)}
            className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-muted-foreground outline-none"
          >
            {RELATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Contexto (opcional)
          </label>
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            rows={3}
            placeholder="Por qué conectás esta entrada con el nodo…"
            className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-muted-foreground outline-none"
          />
        </div>
      </SheetBody>
      <SheetFooter>
        <Button
          type="button"
          disabled={!selectedTarget || isSaving || isBusy}
          onClick={() => void handleSave()}
          className="bg-accent/90 font-mono text-xs uppercase tracking-wider text-black hover:bg-accent/20"
        >
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <LinkIcon className="size-4" />
          )}
          Vincular
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
