"use client";

import {
  EXPENSE_TIER_LABELS,
  INCOME_CATEGORY_LABELS,
} from "@/lib/finanzas/constants";
import type { FinancialTransactionDto } from "@/lib/finanzas/types";
import { cn } from "@/lib/utils";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { useState } from "react";

type PendingApprovalsProps = {
  transactions: FinancialTransactionDto[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onUpdate: (id: string, patch: Partial<FinancialTransactionDto>) => void;
  isBusy?: boolean;
};

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function categoryLabel(tx: FinancialTransactionDto): string {
  if (tx.type === "ingreso" && tx.incomeCategory) {
    return INCOME_CATEGORY_LABELS[tx.incomeCategory];
  }
  if (tx.type === "egreso" && tx.expenseTier) {
    return EXPENSE_TIER_LABELS[tx.expenseTier];
  }
  return tx.type === "ingreso" ? "Ingreso" : "Egreso";
}

export function PendingApprovals({
  transactions,
  onApprove,
  onReject,
  onApproveAll,
  onUpdate,
  isBusy,
}: PendingApprovalsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftConcept, setDraftConcept] = useState("");
  const [draftAmount, setDraftAmount] = useState("");

  if (transactions.length === 0) {
    return (
      <div className="finanzas-noir-panel rounded-xl px-4 py-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Sin pendientes
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Las transacciones analizadas aparecerán aquí para aprobación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Pendientes de aprobación ({transactions.length})
        </h2>
        <button
          type="button"
          disabled={isBusy}
          onClick={onApproveAll}
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
        >
          Aprobar todos
        </button>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => {
          const isEditing = editingId === tx.id;
          return (
            <article
              key={tx.id}
              className="finanzas-noir-panel group rounded-xl p-4 transition-colors hover:border-emerald-500/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        tx.type === "ingreso"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400",
                      )}
                    >
                      {tx.type}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {categoryLabel(tx)}
                    </span>
                    {tx.projectLabel ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        · {tx.projectLabel}
                      </span>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <input
                        value={draftConcept}
                        onChange={(e) => setDraftConcept(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card/80 px-2 py-1 text-sm text-foreground outline-none"
                      />
                      <input
                        value={draftAmount}
                        onChange={(e) => setDraftAmount(e.target.value)}
                        type="number"
                        step="0.01"
                        className="w-32 rounded-lg border border-border bg-card/80 px-2 py-1 text-sm text-foreground outline-none"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">
                        {tx.concept}
                      </p>
                      {tx.vendor ? (
                        <p className="text-xs text-muted-foreground">{tx.vendor}</p>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      tx.type === "ingreso" ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {tx.type === "ingreso" ? "+" : "−"}
                    {formatAmount(tx.amount, tx.currency)}
                  </p>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdate(tx.id, {
                            concept: draftConcept,
                            amount: Number.parseFloat(draftAmount),
                          });
                          setEditingId(null);
                        }}
                        className="flex size-7 items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <CheckIcon className="size-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(tx.id);
                          setDraftConcept(tx.concept);
                          setDraftAmount(String(tx.amount));
                        }}
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground/80"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onReject(tx.id)}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onApprove(tx.id)}
                      className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                      title="Aprobar (Enter)"
                    >
                      <CheckIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
