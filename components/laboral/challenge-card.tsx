"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isHighPriorityWeight } from "@/lib/laboral/base-weight";
import type { LaboralChallenge } from "@/lib/laboral/types";
import { cn } from "@/lib/utils";
import { FlameIcon, Loader2Icon, TargetIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ChallengeCardProps = {
  challenge: LaboralChallenge;
};

const STATUS_COLORS: Record<string, string> = {
  Idea: "bg-slate-500/15 text-slate-700 dark:text-slate-200",
  Diseño: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
  Desarrollo: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
  Pruebas: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  Implantado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  Descartado: "bg-muted text-muted-foreground",
};

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const [isStartingFocus, setIsStartingFocus] = useState(false);
  const isCritical = isHighPriorityWeight(challenge.baseWeight);

  const handleFocus = async () => {
    setIsStartingFocus(true);

    try {
      const response = await fetch("/api/laboral/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo iniciar la sesión");
      }

      sessionStorage.setItem(
        "deprocast:focus-session",
        JSON.stringify(data.session),
      );

      toast.success(`Sesión Focus iniciada: ${challenge.title}`, {
        description: `Peso ${challenge.baseWeight}/12 · Onda ${challenge.onda}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar la sesión Focus";
      toast.error(message);
    } finally {
      setIsStartingFocus(false);
    }
  };

  return (
    <Card
      className={cn(
        "transition-all hover:-translate-y-0.5 hover:shadow-md",
        isCritical &&
          "border-2 border-red-500 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-amber-500/5 shadow-[0_0_24px_rgba(239,68,68,0.35)] ring-2 ring-red-500/40",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm leading-snug">
            {challenge.title}
          </CardTitle>
          {isCritical && (
            <FlameIcon className="size-4 shrink-0 text-red-500" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "font-semibold tabular-nums",
              isCritical && "border-red-500 bg-red-500/20 text-red-700 dark:text-red-200",
            )}
          >
            Peso {challenge.baseWeight}/12
          </Badge>
          <Badge
            className={cn(
              STATUS_COLORS[challenge.estado] ?? STATUS_COLORS.Idea,
            )}
          >
            {challenge.estado}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>ID</span>
          <span className="font-mono text-foreground">{challenge.id}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Avance</span>
          <span className="font-semibold tabular-nums text-foreground">
            {challenge.avancePorcentaje ?? 0}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Horas</span>
          <span className="tabular-nums text-foreground">
            {challenge.horasRealizadas ?? 0} / {challenge.horasEstimadas ?? 0}
          </span>
        </div>
        {challenge.targetDate && (
          <div className="flex items-center gap-1.5 pt-1 text-foreground/80">
            <TargetIcon className="size-3.5 shrink-0" />
            <span>Objetivo: {challenge.targetDate}</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          type="button"
          className={cn(
            "w-full",
            isCritical && "bg-red-600 text-white hover:bg-red-500",
          )}
          disabled={isStartingFocus}
          onClick={() => void handleFocus()}
        >
          {isStartingFocus ? (
            <Loader2Icon className="animate-spin" />
          ) : null}
          Iniciar Sesión Focus
        </Button>
      </CardFooter>
    </Card>
  );
}
