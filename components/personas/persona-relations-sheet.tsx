"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetFooter,
  SheetHeader,
} from "@/components/ui/sheet";
import type {
  PersonaLinkTarget,
  PersonaLinkTargetKind,
} from "@/lib/personas/model";
import { cn } from "@/lib/utils";
import { Loader2Icon, LinkIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type PersonaRelationDraft = {
  personaId: string;
  personaName: string;
  targetKind: PersonaLinkTargetKind;
  targetId: string;
  targetName: string;
  campoSlug?: string;
};

const PERSONA_RELATION_OPTIONS = [
  { value: "colabora_con", label: "Colabora con" },
  { value: "subordinado_de", label: "Subordinado de" },
  { value: "relacionado_con", label: "Relacionado con" },
  { value: "cliente_de", label: "Cliente de" },
  { value: "competidor_de", label: "Competidor de" },
  { value: "menciona_a", label: "Menciona a" },
] as const;

type PersonaRelationsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: { id: string; nombrePrincipal: string } | null;
  draft?: PersonaRelationDraft | null;
  onCreated: () => void;
};

export function PersonaRelationsSheet({
  open,
  onOpenChange,
  source,
  draft,
  onCreated,
}: PersonaRelationsSheetProps) {
  const [linkKind, setLinkKind] = useState<PersonaLinkTargetKind>("persona");
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<PersonaLinkTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<PersonaLinkTarget | null>(
    null,
  );
  const [tipoRelacion, setTipoRelacion] = useState("colabora_con");
  const [rolPrincipal, setRolPrincipal] = useState("participa");
  const [contexto, setContexto] = useState("");
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    setLinkKind("persona");
    setQuery("");
    setTargets([]);
    setSelectedTarget(null);
    setTipoRelacion("colabora_con");
    setRolPrincipal("participa");
    setContexto("");
  }, []);

  useEffect(() => {
    if (!open) return;

    if (draft) {
      setLinkKind(draft.targetKind);
      setSelectedTarget({
        id: draft.targetId,
        kind: draft.targetKind,
        label: draft.targetName,
        sublabel: draft.campoSlug ?? null,
        campoSlug: draft.campoSlug ?? null,
      });
      return;
    }

    resetForm();
  }, [open, draft, resetForm]);

  const loadTargets = useCallback(async () => {
    if (!source || draft) return;
    setIsLoadingTargets(true);
    try {
      const params = new URLSearchParams({ kind: linkKind });
      if (query.trim()) params.set("q", query.trim());
      if (linkKind === "persona") params.set("excludePersonaId", source.id);

      const response = await fetch(`/api/personas/link-targets?${params}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar destinos.");
      }
      setTargets(data.targets ?? []);
    } catch (error) {
      setTargets([]);
      toast.error(
        error instanceof Error ? error.message : "Error al buscar destinos.",
      );
    } finally {
      setIsLoadingTargets(false);
    }
  }, [source, linkKind, query, draft]);

  useEffect(() => {
    if (!open || !source || draft) return;
    const timer = window.setTimeout(() => void loadTargets(), 200);
    return () => window.clearTimeout(timer);
  }, [open, source, linkKind, query, draft, loadTargets]);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!source || !selectedTarget) return;

    setIsSaving(true);
    try {
      let body: Record<string, string | undefined>;

      if (linkKind === "persona") {
        body = {
          origenId: source.id,
          destinoId: selectedTarget.id,
          tipoRelacion,
          contexto: contexto.trim() || undefined,
        };
      } else if (linkKind === "proyecto") {
        body = {
          kind: "persona-proyecto",
          personaId: source.id,
          proyectoId: selectedTarget.id,
          rolPrincipal: rolPrincipal.trim(),
          contexto: contexto.trim() || undefined,
        };
      } else {
        const campoSlug = selectedTarget.campoSlug ?? selectedTarget.sublabel;
        if (!campoSlug) throw new Error("Campo inválido.");
        body = {
          kind: "persona-campo",
          personaId: source.id,
          campoSlug,
          contexto: contexto.trim() || undefined,
        };
      }

      const response = await fetch("/api/personas/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el vínculo.");
      }

      toast.success(
        `Vínculo creado: ${source.nombrePrincipal} → ${selectedTarget.label}`,
      );
      handleClose();
      onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear el vínculo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const fromGraph = Boolean(draft);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetHeader
        title="Vincular persona"
        description={
          source
            ? `${source.nombrePrincipal} → ${selectedTarget?.label ?? "…"}`
            : "Seleccioná un destino"
        }
        onClose={handleClose}
      />
      <SheetBody className="space-y-4">
        {!fromGraph && (
          <>
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              {(
                [
                  ["persona", "Persona"],
                  ["proyecto", "Proyecto"],
                  ["campo", "Campo"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    setLinkKind(kind);
                    setSelectedTarget(null);
                  }}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    linkKind === kind
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Buscar ${linkKind}…`}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />

            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {isLoadingTargets ? (
                <p className="p-2 text-xs text-muted-foreground">Buscando…</p>
              ) : targets.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">
                  Sin resultados.
                </p>
              ) : (
                targets.map((target) => (
                  <button
                    key={`${target.kind}-${target.id}`}
                    type="button"
                    onClick={() => setSelectedTarget(target)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      selectedTarget?.id === target.id &&
                        selectedTarget.kind === target.kind
                        ? "bg-emerald-500/15 text-foreground"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <span className="font-medium">{target.label}</span>
                    {target.sublabel && (
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                        {target.sublabel}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {linkKind === "persona" && (
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Tipo de relación
            </span>
            <select
              value={tipoRelacion}
              onChange={(event) => setTipoRelacion(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            >
              {PERSONA_RELATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {linkKind === "proyecto" && (
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Rol en el proyecto
            </span>
            <input
              value={rolPrincipal}
              onChange={(event) => setRolPrincipal(event.target.value)}
              placeholder="Ej. responsable, colaborador, consultor…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Contexto
          </span>
          <textarea
            value={contexto}
            onChange={(event) => setContexto(event.target.value)}
            placeholder="Detalle del vínculo…"
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
          />
        </label>
      </SheetBody>
      <SheetFooter>
        <Button
          type="button"
          className="w-full"
          disabled={isSaving || !source || !selectedTarget}
          onClick={() => void handleSubmit()}
        >
          {isSaving ? <Loader2Icon className="animate-spin" /> : <LinkIcon />}
          Crear vínculo
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
