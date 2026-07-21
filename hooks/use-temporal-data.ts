"use client";

import { useBabel } from "@/components/babel/babel-context";
import type { DayOffset } from "@/lib/pendientes/types";
import type { TemporalBlock, TemporalRangeResponse } from "@/lib/temporal/types";
import { useCallback, useEffect, useState } from "react";

type UseTemporalDataInput =
  | { mode: "day"; day: DayOffset }
  | { mode: "range"; fromIso: string; toIso: string };

export function useTemporalData(input: UseTemporalDataInput) {
  const { universeFetch, temporalVersion } = useBabel();
  const [blocks, setBlocks] = useState<TemporalBlock[]>([]);
  const [tasks, setTasks] = useState<TemporalBlock[]>([]);
  const [events, setEvents] = useState<TemporalBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mode = input.mode;
  const day = mode === "day" ? input.day : null;
  const fromIso = mode === "range" ? input.fromIso : null;
  const toIso = mode === "range" ? input.toIso : null;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (mode === "day" && day) {
        const response = await universeFetch(`/api/calendario?day=${day}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("No se pudo cargar el día.");
        const data = (await response.json()) as {
          events?: Array<{
            id: string;
            content: string;
            occurredAt: string;
            endsAt?: string | null;
            status: string;
            source: string;
            pillar?: string;
            structuredData?: Record<string, unknown>;
            blockKind?: TemporalBlock["blockKind"];
            actionCost?: number | null;
            executionStatus?: TemporalBlock["executionStatus"];
            ecosystemArea?: TemporalBlock["ecosystemArea"];
            durationMin?: number | null;
          }>;
        };
        const dayEvents: TemporalBlock[] = (data.events ?? []).map((event) => ({
          kind: "event",
          id: event.id,
          title: event.content,
          start: event.occurredAt,
          end: event.endsAt ?? null,
          status: event.status,
          projectId: null,
          weight: event.actionCost ?? null,
          source: event.source,
          pillar: event.pillar,
          structuredData: event.structuredData,
          blockKind: event.blockKind,
          actionCost: event.actionCost,
          executionStatus: event.executionStatus,
          ecosystemArea: event.ecosystemArea,
          durationMin: event.durationMin,
        }));
        setEvents(dayEvents);
        setTasks([]);
        setBlocks(dayEvents);
        return;
      }

      const response = await universeFetch(
        `/api/temporal/range?from=${encodeURIComponent(fromIso ?? "")}&to=${encodeURIComponent(toIso ?? "")}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("No se pudo cargar el rango.");
      const data = (await response.json()) as TemporalRangeResponse;
      setBlocks(data.blocks ?? []);
      setTasks(data.tasks ?? []);
      setEvents(data.events ?? []);
    } catch {
      setBlocks([]);
      setTasks([]);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch, mode, day, fromIso, toIso]);

  useEffect(() => {
    void refresh();
  }, [refresh, temporalVersion]);

  return { blocks, tasks, events, isLoading, refresh };
}
