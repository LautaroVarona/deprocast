"use client";

import { createPersonaAction } from "@/app/personas/actions";
import { getSenadoGraphAction } from "@/app/yo/actions";
import {
  DynamicGraph,
  type DynamicGraphMember,
} from "@/components/yo/mission-senado-graph";
import { Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MissionPersonaOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
  progress: number;
  target: number;
  operatorName: string;
};

export function MissionPersonaOverlay({
  open,
  onOpenChange,
  onCreated,
  progress,
  target,
  operatorName,
}: MissionPersonaOverlayProps) {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [members, setMembers] = useState<DynamicGraphMember[]>([]);
  const [resolvedOperatorName, setResolvedOperatorName] = useState(operatorName);

  useEffect(() => {
    if (!open) return;
    setNombre("");
    setRol("");
    setSaving(false);
    setResolvedOperatorName(operatorName);

    let cancelled = false;
    setLoadingGraph(true);
    void (async () => {
      const result = await getSenadoGraphAction();
      if (cancelled) return;
      if (result.ok) {
        setMembers(result.data.members);
        if (result.data.operator?.name) {
          setResolvedOperatorName(result.data.operator.name);
        }
      }
      setLoadingGraph(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, operatorName]);

  const handleSubmit = async () => {
    const trimmedName = nombre.trim();
    const trimmedRol = rol.trim();
    if (!trimmedName || !trimmedRol || saving) return;

    setSaving(true);
    try {
      const result = await createPersonaAction({
        nombrePrincipal: trimmedName,
        aliases: [],
        notasGenerales: "",
        relationToOperator: trimmedRol,
        connections: [],
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const nextMember: DynamicGraphMember = {
        id: result.data.id,
        name: result.data.nombrePrincipal,
        vinculo: trimmedRol,
      };
      setMembers((prev) => {
        if (prev.some((item) => item.id === nextMember.id)) {
          return prev.map((item) =>
            item.id === nextMember.id ? nextMember : item,
          );
        }
        return [...prev, nextMember];
      });

      toast.success(`${result.data.nombrePrincipal} registrada en el Senado.`);
      setNombre("");
      setRol("");
      await onCreated();

      const nextProgress = progress + 1;
      if (nextProgress >= target) {
        window.setTimeout(() => onOpenChange(false), 700);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const canSubmit = Boolean(nombre.trim() && rol.trim()) && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 md:p-4 lg:p-6">
      <button
        type="button"
        aria-label="Cerrar panel"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={() => !saving && onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="senado-panel-title"
        className="relative z-10 flex h-full w-full max-w-6xl flex-col overflow-hidden border border-legion-bronze/30 bg-zinc-950 shadow-2xl md:h-[min(92dvh,44rem)] md:flex-row md:rounded-sm"
      >
        <section className="relative flex min-h-[14rem] flex-1 flex-col border-b border-legion-bronze/25 md:min-h-0 md:border-r md:border-b-0">
          <header className="flex items-center justify-between gap-3 border-b border-legion-bronze/20 px-4 py-3 md:px-5">
            <div>
              <p className="font-mono text-[10px] tracking-[0.28em] text-legion-bronze uppercase">
                Misión II · Grafo vivo
              </p>
              <p className="mt-0.5 font-display text-sm tracking-[0.04em] text-legion-bone">
                {progress}/{target} personas en el círculo
              </p>
            </div>
            {loadingGraph ? (
              <Loader2Icon className="size-4 animate-spin text-legion-bronze" />
            ) : null}
          </header>
          <DynamicGraph
            operatorName={resolvedOperatorName || "Operador"}
            members={members}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-2"
          />
        </section>

        <aside className="flex w-full shrink-0 flex-col md:w-[22rem] lg:w-[24rem]">
          <header className="flex items-start justify-between gap-3 border-b border-legion-bronze/25 px-4 py-3 md:px-5">
            <div className="min-w-0">
              <h2
                id="senado-panel-title"
                className="font-display text-base tracking-[0.06em] text-legion-bone md:text-lg"
              >
                El Senado · Alta de PERSONA
              </h2>
              <p className="mt-1 font-mono text-[11px] text-legion-bronze/80">
                {progress}/{target} personas registradas
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="rounded-sm border border-legion-bronze/35 p-1.5 text-legion-bronze/80 transition hover:border-legion-bronze hover:text-legion-bone"
            >
              <XIcon className="size-4" />
            </button>
          </header>

          <form
            className="flex flex-1 flex-col gap-4 px-4 py-5 md:px-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="w-full border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none placeholder:text-legion-bone/35 focus:border-legion-bronze"
              required
              autoFocus
              placeholder="Nombre"
              aria-label="Nombre"
            />

            <input
              value={rol}
              onChange={(event) => setRol(event.target.value)}
              className="w-full border border-legion-bronze/35 bg-black/40 px-3 py-2.5 font-mono text-sm text-legion-bone outline-none placeholder:text-legion-bone/35 focus:border-legion-bronze"
              required
              placeholder="Vínculo / Rol"
              aria-label="Vínculo / Rol"
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="genesis-btn mt-auto flex min-h-11 w-full items-center justify-center gap-2 px-4 font-display text-sm tracking-[0.14em] uppercase disabled:opacity-50"
            >
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Registrar Persona
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
