"use client";

import { HEALTH_PILLAR_TABS } from "@/components/salud/constants";
import { HealthRecordForm } from "@/components/salud/health-record-form";
import { HealthTimeline } from "@/components/salud/health-timeline";
import type { HealthPillar, HealthRecordDto } from "@/lib/events/types";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function SaludWorkspace() {
  const [activePillar, setActivePillar] = useState<HealthPillar>("rendimiento");
  const [records, setRecords] = useState<HealthRecordDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPillar, setFilterPillar] = useState<HealthPillar | "all">("all");

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPillar !== "all") params.set("pillar", filterPillar);

      const response = await fetch(`/api/salud/records?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los registros");
      }
      setRecords(data.records ?? []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los registros";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filterPillar]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleSaved = () => {
    toast.success("Registro fijado en telemetría de salud");
    void fetchRecords();
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="text-sm font-semibold">Área de Salud</h1>
        <p className="font-mono text-[10px] text-muted-foreground">
          Biometría y control · Flujo de silicio
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col border-b border-border lg:border-r lg:border-b-0">
          <div
            className="flex flex-wrap gap-1 border-b border-border p-2"
            role="tablist"
            aria-label="Pilares de telemetría"
          >
            {HEALTH_PILLAR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activePillar === tab.id}
                onClick={() => setActivePillar(tab.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  activePillar === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="px-4 pt-3 text-xs text-muted-foreground">
            {HEALTH_PILLAR_TABS.find((t) => t.id === activePillar)?.description}
          </p>

          <HealthRecordForm pillar={activePillar} onSaved={handleSaved} />
        </section>

        <aside className="flex min-h-0 w-full flex-col lg:w-[380px]">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <span className="text-xs font-medium">Timeline</span>
            <select
              className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-xs"
              value={filterPillar}
              onChange={(e) =>
                setFilterPillar(e.target.value as HealthPillar | "all")
              }
            >
              <option value="all">Todos los pilares</option>
              {HEALTH_PILLAR_TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <HealthTimeline records={records} isLoading={isLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}
