"use client";

import type { HealthDraft } from "@/lib/health/health-broker-types";
import { Button } from "@/components/ui/button";

type Props = {
  draft: HealthDraft;
  isSaving: boolean;
  onApprove: () => void;
  onDiscard: () => void;
};

function nutritionSummary(draft: HealthDraft): string {
  const items = draft.nutrition?.items ?? [];
  if (!items.length) return draft.summary;
  return items
    .slice(0, 3)
    .map((item) => item.quantity ? `${item.quantity} ${item.name}` : item.name)
    .join(" | ");
}

function trainingSummary(draft: HealthDraft): string {
  const sets = draft.training?.sets ?? [];
  if (!sets.length) return draft.summary;
  return sets
    .slice(0, 3)
    .map((set) => {
      const load =
        set.weightKg !== undefined && set.reps !== undefined
          ? ` ${set.weightKg}kg x${set.reps}`
          : "";
      return `${set.exercise}${load}`;
    })
    .join(" | ");
}

export function HealthDraftCard({ draft, isSaving, onApprove, onDiscard }: Props) {
  const compact =
    draft.domain === "alimentacion" ? nutritionSummary(draft) : trainingSummary(draft);
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-2xl">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Borrador health-broker
      </p>
      <p className="mt-1 text-sm text-foreground">{compact || draft.summary}</p>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={onApprove} disabled={isSaving}>
          Aprobar
        </Button>
        <Button size="sm" variant="outline" onClick={onDiscard} disabled={isSaving}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
