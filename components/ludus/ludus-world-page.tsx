"use client";

import { LudusWorldMap } from "@/components/ludus/ludus-world-map";
import type { LudusWorldStats } from "@/lib/ludus/types";
import { useEffect, useState } from "react";

export function LudusWorldPage() {
  const [stats, setStats] = useState<LudusWorldStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/ludus/stats", { cache: "no-store" });
        if (!response.ok) return;
        const data: LudusWorldStats = await response.json();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return <LudusWorldMap stats={stats} isLoading={isLoading} />;
}
