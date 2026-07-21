"use client";

import type { AsaltoItem } from "@/lib/pendientes/asaltos";
import { ASSAULT_BLOCK_OPTIONS } from "@/lib/ludus/constants";
import { cn } from "@/lib/utils";
import { Loader2Icon, ShieldIcon, ZapIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useBabel } from "@/components/babel/babel-context";

type AsaltoChipProps = {
  asalto: AsaltoItem;
  onStarted?: () => void;
};

export function AsaltoChip({ asalto, onStarted }: AsaltoChipProps) {
  const router = useRouter();
  const { bumpTemporal } = useBabel();
  const [isStarting, setIsStarting] = useState(false);

  const defaultDuration =
    ASSAULT_BLOCK_OPTIONS.find((o) => o.minutes === 25)?.minutes ??
    ASSAULT_BLOCK_OPTIONS[1]?.minutes ??
    25;

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const response = await fetch("/api/ludus/trinchera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: asalto.title,
          durationMin: defaultDuration,
          pendingTaskId: asalto.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo iniciar el asalto.");
      }
      toast.success("Asalto iniciado");
      bumpTemporal();
      onStarted?.();
      router.push("/ludus/trinchera");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al iniciar asalto.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleStart()}
      disabled={isStarting}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left transition-all hover:bg-muted/70",
        asalto.tier === "boss" && "border-accent/40 ring-1 ring-accent/20",
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          asalto.tier === "boss"
            ? "bg-accent/20 text-accent dark:text-accent"
            : "bg-destructive/15 text-destructive dark:text-destructive",
        )}
      >
        {isStarting ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : asalto.tier === "boss" ? (
          <ZapIcon className="size-3.5" />
        ) : (
          <ShieldIcon className="size-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{asalto.title}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {asalto.effectiveWeight > 0
            ? `Peso efectivo ${asalto.effectiveWeight}`
            : asalto.weight !== null
              ? `Peso ${asalto.weight}`
              : "Sin calibrar"}
          {asalto.bloque ? ` · ${asalto.bloque}` : ""}
        </p>
      </div>
    </button>
  );
}
