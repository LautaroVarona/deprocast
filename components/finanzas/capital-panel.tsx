"use client";

import type { FinancialCapitalDto } from "@/lib/finanzas/types";
import { useState } from "react";

type CapitalPanelProps = {
  capital: FinancialCapitalDto | null;
  onSave: (amount: number) => void;
  isSaving?: boolean;
};

export function CapitalPanel({ capital, onSave, isSaving }: CapitalPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const displayAmount = capital?.amount ?? 0;
  const currency = capital?.currency ?? "EUR";

  const formatted = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(displayAmount);

  return (
    <div className="finanzas-noir-panel rounded-xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Capital económico
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Lo que tengo</p>

      {isEditing ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-2xl font-semibold tabular-nums text-foreground outline-none"
            autoFocus
          />
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              const amount = Number.parseFloat(draft);
              if (Number.isFinite(amount)) {
                onSave(amount);
                setIsEditing(false);
              }
            }}
            className="shrink-0 rounded-lg bg-emerald-500/15 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400"
          >
            Guardar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(displayAmount));
            setIsEditing(true);
          }}
          className="mt-2 block text-left"
        >
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatted}
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Click para editar
          </span>
        </button>
      )}
    </div>
  );
}
