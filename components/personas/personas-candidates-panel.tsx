"use client";

import { Button } from "@/components/ui/button";
import type { PersonaCardDto } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import {
  BadgeCheckIcon,
  Loader2Icon,
  MergeIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type PersonasCandidatesPanelProps = {
  candidates: PersonaCardDto[];
  isLoading: boolean;
  onEdit: (persona: PersonaCardDto) => void;
  onMerge: (persona: PersonaCardDto) => void;
  onChanged: () => void;
};

export function PersonasCandidatesPanel({
  candidates,
  isLoading,
  onEdit,
  onMerge,
  onChanged,
}: PersonasCandidatesPanelProps) {
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const handlePromote = async (persona: PersonaCardDto) => {
    setPromotingId(persona.id);
    try {
      const response = await fetch(
        `/api/personas/${encodeURIComponent(persona.id)}/promote`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo sellar.");
      }
      toast.success(`«${persona.primaryName}» sellada en el grafo.`);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al promover.",
      );
    } finally {
      setPromotingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center font-mono text-[10px] text-muted-foreground">
        Escaneando candidatas del motor-kg…
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <SparklesIcon className="size-5 text-amber-500/70" aria-hidden />
        <p>No hay personas en revisión.</p>
        <p className="max-w-sm text-xs">
          Las extracciones del motor-kg y stubs de incubadora aparecen aquí
          hasta que las edites, fusiones o selles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        {candidates.length} candidata{candidates.length === 1 ? "" : "s"} · HITL
        de identidad
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {candidates.map((persona) => {
          const isPromoting = promotingId === persona.id;
          return (
            <li
              key={persona.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {persona.primaryName}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase",
                      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    En revisión
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    conf {(persona.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {persona.aliases.length > 0 ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Aliases: {persona.aliases.join(", ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sin aliases · {persona.mentionCount} mención
                    {persona.mentionCount === 1 ? "" : "es"}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(persona)}
                >
                  <PencilIcon className="size-3.5" />
                  Corregir
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onMerge(persona)}
                >
                  <MergeIcon className="size-3.5" />
                  Fusionar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handlePromote(persona)}
                  disabled={isPromoting}
                >
                  {isPromoting ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <BadgeCheckIcon className="size-3.5" />
                  )}
                  Sellar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
