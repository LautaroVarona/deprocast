"use client";

import { EventProposalsPanel } from "@/components/events/event-proposals-panel";
import { JournalCanvas } from "@/components/diario/journal-canvas";
import { JournalSidebar } from "@/components/diario/journal-sidebar";
import type { ContextEventDto } from "@/lib/events/types";
import type {
  JournalEntryDetail,
  JournalEntrySummary,
  JournalOnda,
} from "@/lib/journal/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function DiarioWorkspace() {
  const initial = getCurrentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<JournalEntrySummary[]>([]);
  const [daysWithEntries, setDaysWithEntries] = useState<number[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const [activeOnda, setActiveOnda] = useState<JournalOnda>("DIARIO");
  const [content, setContent] = useState("");
  const [purifyOnSave, setPurifyOnSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<JournalEntryDetail | null>(
    null,
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [proposedEvents, setProposedEvents] = useState<ContextEventDto[]>([]);

  const fetchEntries = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const response = await fetch(`/api/journal/list?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el historial");
      }

      setEntries(data.entries);
      setDaysWithEntries(data.daysWithEntries);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial";
      toast.error(message);
    } finally {
      setIsLoadingList(false);
    }
  }, [year, month, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntries();
    }, searchQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchEntries, searchQuery]);

  const loadPreview = useCallback(async (entry: JournalEntrySummary) => {
    setSelectedEntryId(entry.id);
    setIsPreviewLoading(true);
    setPreviewEntry(null);

    try {
      const response = await fetch(
        `/api/journal/${encodeURIComponent(entry.id)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la entrada");
      }
      setPreviewEntry(data.entry);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar la entrada";
      toast.error(message);
      setSelectedEntryId(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/journal/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          onda: activeOnda,
          purify: purifyOnSave,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la entrada");
      }

      if (purifyOnSave && data.validarUrl) {
        toast.success("Entrada coagulada. Revisá en Validar.", {
          description: data.entry.title,
          action: {
            label: "Ir a Validar",
            onClick: () => {
              window.location.href = data.validarUrl as string;
            },
          },
        });
      } else {
        toast.success("Entrada fijada en la Torre de Babel.", {
          description: data.entry.title,
        });
      }

      if (Array.isArray(data.proposedEvents) && data.proposedEvents.length > 0) {
        setProposedEvents(data.proposedEvents as ContextEventDto[]);
      } else {
        setProposedEvents([]);
      }

      setContent("");
      await fetchEntries();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la entrada";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      <JournalSidebar
        year={year}
        month={month}
        selectedDay={selectedDay}
        daysWithEntries={daysWithEntries}
        entries={entries}
        selectedEntryId={selectedEntryId}
        searchQuery={searchQuery}
        isLoading={isLoadingList}
        onMonthChange={(nextYear, nextMonth) => {
          setYear(nextYear);
          setMonth(nextMonth);
        }}
        onDaySelect={setSelectedDay}
        onSearchChange={setSearchQuery}
        onEntrySelect={(entry) => void loadPreview(entry)}
      />

      <JournalCanvas
        activeOnda={activeOnda}
        content={content}
        purifyOnSave={purifyOnSave}
        isSaving={isSaving}
        previewEntry={previewEntry}
        isPreviewLoading={isPreviewLoading}
        onOndaChange={setActiveOnda}
        onContentChange={setContent}
        onPurifyToggle={setPurifyOnSave}
        onSave={() => void handleSave()}
        onClosePreview={() => {
          setPreviewEntry(null);
          setSelectedEntryId(null);
        }}
      />

      <EventProposalsPanel
        events={proposedEvents}
        onResolved={() => setProposedEvents([])}
      />
    </div>
  );
}
