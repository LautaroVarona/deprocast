"use client";

import { listPendingCandidatesAction } from "@/app/triage/actions";
import { TriageStack } from "@/components/triage/triage-stack";
import type { EntityCandidateDto } from "@/lib/triage/types";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TriageWorkspaceProps = {
  onChanged?: () => void;
};

export function TriageWorkspace({ onChanged }: TriageWorkspaceProps) {
  const [candidates, setCandidates] = useState<EntityCandidateDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listPendingCandidatesAction();
    setIsLoading(false);
    if (!result.ok) {
      setError(result.error);
      setCandidates([]);
      return;
    }
    setCandidates(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex min-h-[28rem] flex-1 items-center justify-center gap-2 font-mono text-xs text-[#ff6b35]/80">
        <Loader2Icon className="size-4 animate-spin" />
        Escaneando cola Mastropiero…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[20rem] flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-mono text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[#ff6b35]/40 px-3 py-1.5 font-mono text-[11px] text-[#ff8f5a] uppercase"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a0f0a_0%,#050505_70%)]">
      <TriageStack
        initialCandidates={candidates}
        onQueueEmpty={() => onChanged?.()}
      />
    </div>
  );
}
