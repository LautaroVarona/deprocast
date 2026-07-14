"use client";

import { getFastingElapsedMs } from "@/components/salud/lib/fasting";
import type { HealthRecordDto } from "@/lib/events/types";
import { useEffect, useState } from "react";

export function useLiveFastingMs(
  records: HealthRecordDto[],
): number | null {
  const [elapsedMs, setElapsedMs] = useState<number | null>(() =>
    getFastingElapsedMs(records),
  );

  useEffect(() => {
    const tick = () => setElapsedMs(getFastingElapsedMs(records));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [records]);

  return elapsedMs;
}
