"use client";

import { useBabel } from "@/components/babel/babel-context";
import { HistorialDaySection } from "@/components/historial/historial-day-section";
import type { ActivityDayGroup } from "@/components/historial/historial-day-section";
import { HistorialExportMenu } from "@/components/historial/historial-export-menu";
import { HistorialStatsBar } from "@/components/historial/historial-stats-bar";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/historial/types";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, HistoryIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/ui/sheet";

type HistorialSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HistorialSheet({ open, onOpenChange }: HistorialSheetProps) {
  const { universeFetch, universeSlug, isLoading: isUniverseLoading } = useBabel();
  const [groups, setGroups] = useState<ActivityDayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allEntries = useMemo(
    () => groups.flatMap((group) => group.entries),
    [groups],
  );

  const agentCount = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of allEntries) {
      if (entry.agentId) ids.add(entry.agentId);
    }
    return ids.size;
  }, [allEntries]);

  const fetchHistorial = useCallback(async () => {
    if (!open) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ grouped: "true", days: "7", limit: "40" });
      const response = await universeFetch(`/api/historial?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar historial");
      }
      const data = (await response.json()) as { groups: ActivityDayGroup[] };
      setGroups(data.groups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [open, universeFetch]);

  useEffect(() => {
    if (isUniverseLoading || !open) return;
    void fetchHistorial();
  }, [fetchHistorial, universeSlug, isUniverseLoading, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} className="max-w-xl">
      <SheetHeader
        title="Historial de actividad"
        description="Ingesta, audio, validación, agentes e IA — últimos 7 días"
        onClose={() => onOpenChange(false)}
      />

      <SheetBody className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <HistoryIcon className="size-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Cada evento registra qué agente intervino y qué modelo de IA se usó.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
            Cargando…
          </div>
        ) : error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Sin actividad registrada en este período.
          </p>
        ) : (
          <>
            <HistorialStatsBar entries={allEntries} agentCount={agentCount} />

            <div className="flex flex-wrap gap-1">
              {ACTIVITY_CATEGORIES.slice(0, 8).map((cat) => (
                <span
                  key={cat}
                  className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {CATEGORY_LABELS[cat]}
                </span>
              ))}
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                +{ACTIVITY_CATEGORIES.length - 8} más
              </span>
            </div>

            <div className="space-y-6">
              {groups.map((group) => (
                <HistorialDaySection key={group.dayKey} group={group} compact />
              ))}
            </div>
          </>
        )}
      </SheetBody>

      <SheetFooter className="space-y-3">
        <HistorialExportMenu variant="compact" days={7} />
        <Link
          href="/historial"
          onClick={() => onOpenChange(false)}
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "w-full justify-center gap-2",
          )}
        >
          Ver historial completo
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </SheetFooter>
    </Sheet>
  );
}

type HistorialTriggerProps = {
  className?: string;
  showLabel?: boolean;
  variant?: "ghost" | "outline";
  isActive?: boolean;
};

export function HistorialTrigger({
  className,
  showLabel = true,
  variant = "ghost",
  isActive = false,
}: HistorialTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        className={cn(
          "gap-1.5",
          isActive && "bg-muted text-foreground",
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label="Abrir historial de actividad"
        aria-pressed={isActive}
      >
        <HistoryIcon className="size-3.5" aria-hidden />
        {showLabel ? <span>Historial</span> : null}
      </Button>
      <HistorialSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
