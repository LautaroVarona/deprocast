"use client";

import { createPersonaAction } from "@/app/personas/actions";
import { useBabel } from "@/components/babel/babel-context";
import { AliasTagInput } from "@/components/personas/alias-tag-input";
import { ConnectionEntityPicker } from "@/components/personas/connection-entity-picker";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetHeader,
} from "@/components/ui/sheet";
import type {
  Persona,
  PersonaConnectionDraft,
  PersonaLinkTarget,
} from "@/lib/personas/model";
import { cn } from "@/lib/utils";
import { Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type NuevaPersonaSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (persona: Persona) => void;
};

type DraftConnection = PersonaConnectionDraft & { localId: string };

const EMPTY_FORM = {
  nombre: "",
  aliases: [] as string[],
  notas: "",
  relationToOperator: "",
};

export function NuevaPersonaSidebar({
  open,
  onOpenChange,
  onCreated,
}: NuevaPersonaSidebarProps) {
  const { universeSlug } = useBabel();
  const [nombre, setNombre] = useState(EMPTY_FORM.nombre);
  const [aliases, setAliases] = useState<string[]>(EMPTY_FORM.aliases);
  const [notas, setNotas] = useState(EMPTY_FORM.notas);
  const [relationToOperator, setRelationToOperator] = useState(
    EMPTY_FORM.relationToOperator,
  );
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [connections, setConnections] = useState<DraftConnection[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(EMPTY_FORM.nombre);
    setAliases(EMPTY_FORM.aliases);
    setNotas(EMPTY_FORM.notas);
    setRelationToOperator(EMPTY_FORM.relationToOperator);
    setConnections([]);
    setIsSaving(false);

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/yo");
        if (!res.ok) return;
        const data = (await res.json()) as {
          yo?: { operatorName?: string | null };
          profile?: { displayName?: string };
        };
        const name =
          data.yo?.operatorName?.trim() ||
          data.profile?.displayName?.trim() ||
          null;
        if (!cancelled) setOperatorName(name);
      } catch {
        if (!cancelled) setOperatorName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const excludeIds = useMemo(
    () => connections.map((connection) => connection.targetId),
    [connections],
  );

  const addConnection = (target: PersonaLinkTarget) => {
    if (target.kind !== "persona" && target.kind !== "proyecto") return;
    if (connections.some((connection) => connection.targetId === target.id)) {
      return;
    }

    const draft: DraftConnection = {
      localId: crypto.randomUUID(),
      targetId: target.id,
      targetKind: target.kind,
      targetLabel: target.label,
      relationContext: "",
    };

    setConnections((prev) => [...prev, draft]);
  };

  const updateConnectionContext = (localId: string, relationContext: string) => {
    setConnections((prev) =>
      prev.map((connection) =>
        connection.localId === localId
          ? { ...connection, relationContext }
          : connection,
      ),
    );
  };

  const removeConnection = (localId: string) => {
    setConnections((prev) =>
      prev.filter((connection) => connection.localId !== localId),
    );
  };

  const handleSubmit = async () => {
    const trimmedName = nombre.trim();
    if (!trimmedName) return;

    const incomplete = connections.find(
      (connection) => !connection.relationContext.trim(),
    );
    if (incomplete) {
      toast.error(
        `Indicá el contexto del vínculo con ${incomplete.targetLabel}.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const result = await createPersonaAction({
        nombrePrincipal: trimmedName,
        aliases,
        notasGenerales: notas,
        relationToOperator: relationToOperator.trim() || undefined,
        universeSlug,
        connections: connections.map(
          ({ localId: _localId, ...connection }) => connection,
        ),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`${result.data.nombrePrincipal} indexada.`);
      onCreated(result.data);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const relationLabel = operatorName
    ? `Relación con ${operatorName}`
    : "Relación con el Operador";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title="Nueva persona"
        description="Alta manual con aliases y conexiones."
        onClose={() => onOpenChange(false)}
      />
      <SheetBody>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Nombre
            </span>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
              autoFocus
            />
          </label>

          <fieldset className="space-y-1.5">
            <legend className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Aliases / Apodos
            </legend>
            <AliasTagInput aliases={aliases} onChange={setAliases} />
            <p className="text-[11px] text-muted-foreground">
              Enter o coma para añadir un chip.
            </p>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              {relationLabel}
            </span>
            <input
              value={relationToOperator}
              onChange={(event) => setRelationToOperator(event.target.value)}
              placeholder={
                operatorName
                  ? `Ej. Amigo de ${operatorName}, jefe, mentor…`
                  : "Ej. Amigo, jefe, mentor…"
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <p className="text-[11px] text-muted-foreground">
              Opcional. Define el vínculo directo con{" "}
              {operatorName ?? "el Operador"} en el grafo.
            </p>
          </label>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Notas
            </span>
            <textarea
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Otras conexiones
            </legend>
            <ConnectionEntityPicker
              excludeIds={excludeIds}
              onSelect={addConnection}
            />

            {connections.length > 0 && (
              <ul className="space-y-2">
                {connections.map((connection) => (
                  <li
                    key={connection.localId}
                    className="rounded-lg border border-border bg-muted/30 p-2.5"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {connection.targetLabel}
                        </p>
                        <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          {connection.targetKind}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeConnection(connection.localId)}
                        aria-label={`Quitar ${connection.targetLabel}`}
                      >
                        <XIcon />
                      </Button>
                    </div>
                    <input
                      value={connection.relationContext}
                      onChange={(event) =>
                        updateConnectionContext(
                          connection.localId,
                          event.target.value,
                        )
                      }
                      placeholder="Contexto del vínculo (ej. Es el director del proyecto, o Es mi jefe)"
                      className={cn(
                        "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        !connection.relationContext.trim() &&
                          "border-dashed",
                      )}
                      required
                    />
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSaving || !nombre.trim()}
            >
              {isSaving && <Loader2Icon className="animate-spin" />}
              Crear persona
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetBody>
    </Sheet>
  );
}
