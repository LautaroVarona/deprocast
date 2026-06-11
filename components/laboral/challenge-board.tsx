"use client";

import { ChallengeCard } from "@/components/laboral/challenge-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isHighPriorityWeight } from "@/lib/laboral/base-weight";
import type { LaboralChallenge } from "@/lib/laboral/types";
import { cn } from "@/lib/utils";
import { LayersIcon } from "lucide-react";
import { useMemo } from "react";

type ChallengeBoardProps = {
  challenges: LaboralChallenge[];
  isLoading?: boolean;
};

const ONDA_PALETTE = [
  "border-l-amber-500",
  "border-l-violet-500",
  "border-l-sky-500",
  "border-l-emerald-500",
  "border-l-rose-500",
  "border-l-orange-500",
];

function groupByOnda(challenges: LaboralChallenge[]): Map<string, LaboralChallenge[]> {
  const groups = new Map<string, LaboralChallenge[]>();

  for (const challenge of challenges) {
    const key = challenge.onda.trim() || "SIN ÁREA";
    const bucket = groups.get(key) ?? [];
    bucket.push(challenge);
    groups.set(key, bucket);
  }

  for (const [, items] of groups) {
    items.sort((a, b) => b.baseWeight - a.baseWeight);
  }

  return new Map(
    [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "es")),
  );
}

export function ChallengeBoard({ challenges, isLoading }: ChallengeBoardProps) {
  const grouped = useMemo(() => groupByOnda(challenges), [challenges]);
  const criticalCount = challenges.filter((c) =>
    isHighPriorityWeight(c.baseWeight),
  ).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Cargando tablero laboral...
        </CardContent>
      </Card>
    );
  }

  if (challenges.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <LayersIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay retos importados. Subí el CSV del Excel de control
            para generar las tarjetas por Onda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{challenges.length} retos</Badge>
        <Badge variant="outline">{grouped.size} ondas</Badge>
        {criticalCount > 0 && (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-200">
            {criticalCount} críticos (peso 10–12)
          </Badge>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {[...grouped.entries()].map(([onda, items], index) => {
          const ondaCritical = items.filter((item) =>
            isHighPriorityWeight(item.baseWeight),
          ).length;

          return (
            <Card
              key={onda}
              className={cn(
                "border-l-4",
                ONDA_PALETTE[index % ONDA_PALETTE.length],
              )}
            >
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">{onda}</CardTitle>
                <div className="flex gap-1.5">
                  <Badge variant="secondary">{items.length}</Badge>
                  {ondaCritical > 0 && (
                    <Badge className="bg-red-500 text-white hover:bg-red-500">
                      {ondaCritical} 🔥
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((challenge) => (
                    <ChallengeCard key={challenge.filename} challenge={challenge} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
