"use client";

import { HermeticScale } from "@/components/pendientes/hermetic-scale";
import { Button } from "@/components/ui/button";
import type { PendingTaskDto } from "@/lib/pendientes/types";
import { cn } from "@/lib/utils";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useState } from "react";

type QuantomoEnergyCardProps = {
  task: PendingTaskDto;
  onCrystallize: (taskId: string, weight: number) => Promise<void>;
  onReject: (taskId: string) => Promise<void>;
};

export function QuantomoEnergyCard({
  task,
  onCrystallize,
  onReject,
}: QuantomoEnergyCardProps) {
  const [weight, setWeight] = useState(task.weight ?? 6);
  const [phase, setPhase] = useState<"idle" | "leaving" | "done">("idle");
  const [outcome, setOutcome] = useState<"crystallized" | "rejected" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const handleCrystallize = async () => {
    if (busy || phase !== "idle") return;
    setBusy(true);
    try {
      await onCrystallize(task.id, weight);
      setOutcome("crystallized");
      setPhase("leaving");
      window.setTimeout(() => setPhase("done"), 280);
    } catch {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (busy || phase !== "idle") return;
    setBusy(true);
    try {
      await onReject(task.id);
      setOutcome("rejected");
      setPhase("leaving");
      window.setTimeout(() => setPhase("done"), 280);
    } catch {
      setBusy(false);
    }
  };

  if (phase === "done") {
    return (
      <div
        className={cn(
          "flex min-h-[9.5rem] flex-col items-center justify-center rounded-lg px-4 py-6 text-center animate-in fade-in duration-300",
          outcome === "crystallized"
            ? "border border-primary/30 bg-primary/5"
            : "border border-border bg-foreground/[0.03]",
        )}
        role="status"
      >
        <p
          className={cn(
            "font-mono text-[11px] tracking-wide",
            outcome === "crystallized" ? "text-primary" : "text-muted-foreground",
          )}
        >
          {outcome === "crystallized"
            ? "Quántomo cristalizado en la matriz"
            : "Quántomo descartado"}
        </p>
      </div>
    );
  }

  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border border-accent/20 bg-background p-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.06)] transition-all duration-300 ease-out",
        phase === "leaving" && "scale-95 opacity-0",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-foreground">
          {task.title}
        </h3>
        <span className="shrink-0 rounded border border-accent/25 bg-accent/5 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-accent uppercase">
          {task.source}
        </span>
      </div>

      {task.description ? (
        <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        {task.universeSlug ?? "babel"}
        {task.listadorConfidence !== null
          ? ` · conf ${Math.round(task.listadorConfidence * 100)}%`
          : ""}
      </p>

      <div className="mt-3">
        <HermeticScale
          value={weight}
          onChange={setWeight}
          disabled={busy}
          size="sm"
        />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-3">
        <Button
          size="sm"
          className="flex-1 gap-1.5 bg-accent text-black hover:bg-accent/90"
          disabled={busy}
          onClick={() => void handleCrystallize()}
        >
          {busy ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <CheckIcon className="size-3.5" />
          )}
          Cristalizar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-border"
          disabled={busy}
          onClick={() => void handleReject()}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}
