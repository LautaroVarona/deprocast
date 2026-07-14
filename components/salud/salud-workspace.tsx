"use client";

import { SALUD_TABS } from "@/components/salud/constants";
import { SaludHub } from "@/components/salud/salud-hub";
import { AlimentacionPanel } from "@/components/salud/panels/alimentacion-panel";
import { DeportePanel } from "@/components/salud/panels/deporte-panel";
import { MasPanel } from "@/components/salud/panels/mas-panel";
import { TelemetriaPanel } from "@/components/salud/panels/telemetria-panel";
import type { SaludTab } from "@/components/salud/types";
import type { HealthRecordDto } from "@/lib/events/types";
import { ChevronLeftIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function SaludWorkspace() {
  const [activeTab, setActiveTab] = useState<SaludTab | null>(null);
  const [records, setRecords] = useState<HealthRecordDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightRecordId, setHighlightRecordId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const response = await fetch("/api/salud/records?limit=100", {
        cache: "no-store",
      });
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
  }, []);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const combustibleRecords = useMemo(
    () => records.filter((record) => record.pillar === "combustible"),
    [records],
  );

  const rendimientoRecords = useMemo(
    () => records.filter((record) => record.pillar === "rendimiento"),
    [records],
  );

  const handleSaved = (record?: HealthRecordDto) => {
    if (record) {
      setRecords((prev) => {
        if (prev.some((item) => item.id === record.id)) return prev;
        return [record, ...prev];
      });
      setHighlightRecordId(record.id);
    }
    void fetchRecords();
  };

  const activeLabel =
    SALUD_TABS.find((tab) => tab.id === activeTab)?.label ?? "Salud";

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800/80 px-4 py-3">
        {activeTab ? (
          <button
            type="button"
            onClick={() => setActiveTab(null)}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
            aria-label="Volver"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
        ) : null}
        <h1 className="text-sm font-semibold">
          {activeTab ? activeLabel : "Salud"}
        </h1>
      </header>

      {activeTab === null ? (
        <SaludHub records={records} onSelect={setActiveTab} />
      ) : (
        <div
          key={activeTab}
          className="min-h-0 flex-1 overflow-hidden animate-in fade-in duration-200"
        >
          {activeTab === "telemetria" ? <TelemetriaPanel /> : null}
          {activeTab === "alimentacion" ? (
            <AlimentacionPanel
              records={combustibleRecords}
              isLoading={isLoading}
              highlightId={highlightRecordId}
              onSaved={handleSaved}
            />
          ) : null}
          {activeTab === "deporte" ? (
            <DeportePanel
              records={rendimientoRecords}
              isLoading={isLoading}
              onSaved={handleSaved}
            />
          ) : null}
          {activeTab === "mas" ? <MasPanel /> : null}
        </div>
      )}
    </div>
  );
}
