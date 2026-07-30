"use client";

import { TriageStack } from "@/components/cortex/TriageStack";
import { ValidarWorkspace } from "@/components/validar/validar-workspace";
import { listTriageQueueAction } from "@/lib/cortex/actions";
import type { TriageCardDto } from "@/lib/cortex/triage-types";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ValidarMode = "entropia" | "aduana";

type ValidarShellProps = {
  initialTriageItems: TriageCardDto[];
};

const ENTROPIA_POLL_MS = 8_000;

export function ValidarShell({ initialTriageItems }: ValidarShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("modo");
  const reviewDeepLink =
    searchParams.get("id")?.trim() || searchParams.get("review")?.trim() || null;

  // Deep-link a un PurifierReview → Aduana (nunca Entropía vacía).
  const mode: ValidarMode =
    modeParam === "aduana" || (Boolean(reviewDeepLink) && modeParam !== "entropia")
      ? "aduana"
      : "entropia";

  const [triageItems, setTriageItems] =
    useState<TriageCardDto[]>(initialTriageItems);
  const [remaining, setRemaining] = useState(initialTriageItems.length);

  const refreshEntropia = useCallback(async () => {
    const result = await listTriageQueueAction();
    if (!result.ok) return;
    setTriageItems(result.data);
    setRemaining(result.data.length);
  }, []);

  useEffect(() => {
    setTriageItems(initialTriageItems);
    setRemaining(initialTriageItems.length);
  }, [initialTriageItems]);

  // Poll Cola de Entropía: Quantador escribe PendingTask/Quantomo en background.
  useEffect(() => {
    if (mode !== "entropia") return;

    void refreshEntropia();
    const timer = window.setInterval(() => {
      void refreshEntropia();
    }, ENTROPIA_POLL_MS);

    const onFocus = () => {
      void refreshEntropia();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [mode, refreshEntropia]);

  const setMode = useCallback(
    (next: ValidarMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "entropia") {
        params.delete("modo");
        params.delete("id");
        params.delete("review");
      } else {
        params.set("modo", "aduana");
      }
      const qs = params.toString();
      router.replace(qs ? `/validar?${qs}` : "/validar", { scroll: false });
    },
    [router, searchParams],
  );

  // Normalizar `?review=` → `?modo=aduana&id=` para ValidarWorkspace.
  useEffect(() => {
    const reviewOnly = searchParams.get("review")?.trim();
    const idParam = searchParams.get("id")?.trim();
    if (!reviewOnly || idParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("review");
    params.set("modo", "aduana");
    params.set("id", reviewOnly);
    router.replace(`/validar?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 border-b border-[#FFB000]/25 bg-zinc-950 px-3 py-2">
        <ModeTab
          active={mode === "entropia"}
          onClick={() => setMode("entropia")}
          label="Cola de Entropía"
          count={remaining}
        />
        <ModeTab
          active={mode === "aduana"}
          onClick={() => setMode("aduana")}
          label="Aduana Purifier"
        />
      </div>

      {mode === "entropia" ? (
        <TriageStack
          initialItems={triageItems}
          onRemainingChange={setRemaining}
          className="min-h-0"
        />
      ) : (
        <ValidarWorkspace />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors",
        active
          ? "border-[#FFB000] bg-[#FFB000]/10 text-[#FFB000]"
          : "border-transparent text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-[#FFB000]" : "text-zinc-600",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
