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
    .map((item) => (item.quantity ? `${item.quantity} ${item.name}` : item.name))
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
  const totals = draft.nutrition?.totals;
  const intensity = draft.training?.intensity;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-amber-600/90 dark:text-amber-400/90">
            Borrador IA · {draft.domain}
          </p>
          <p className="mt-0.5 truncate text-sm text-foreground">
            {compact || draft.summary}
          </p>
          {draft.domain === "alimentacion" && totals ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {Math.round(totals.calories ?? 0)} kcal · P {Math.round(totals.protein ?? 0)} / C{" "}
              {Math.round(totals.carbs ?? 0)} / G {Math.round(totals.fat ?? 0)}
            </p>
          ) : null}
          {draft.domain === "entrenamiento" && intensity ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Intensidad {intensity}
              {draft.training?.durationMin
                ? ` · ${draft.training.durationMin} min`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" onClick={onApprove} disabled={isSaving}>
            Aprobar
          </Button>
          <Button size="sm" variant="outline" onClick={onDiscard} disabled={isSaving}>
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
}
