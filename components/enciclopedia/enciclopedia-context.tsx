"use client";

import { MAX_SESSION_NODES } from "@/lib/enciclopedia/constants";
import type {
  EncyclopediaEntryDto,
  EncyclopediaReportType,
  SessionEdge,
} from "@/lib/enciclopedia/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type EnciclopediaContextValue = {
  sessionEntries: EncyclopediaEntryDto[];
  sessionEdges: SessionEdge[];
  currentEntry: EncyclopediaEntryDto | null;
  explorationStack: EncyclopediaEntryDto[];
  isBusy: boolean;
  error: string | null;
  exploreConcept: (
    concept: string,
    options?: {
      parentEntryId?: string;
      triggerTerm?: string;
      asRoot?: boolean;
    },
  ) => Promise<void>;
  selectEntry: (entryId: string) => void;
  goBack: () => void;
  resetSession: () => void;
  submitReport: (
    type: EncyclopediaReportType,
    comment?: string,
  ) => Promise<void>;
  linkToCorpus: (
    targets: {
      nodeId: string;
      relationType: string;
      context?: string;
    }[],
  ) => Promise<void>;
};

const EnciclopediaContext = createContext<EnciclopediaContextValue | null>(null);

function upsertEntry(
  entries: EncyclopediaEntryDto[],
  entry: EncyclopediaEntryDto,
): EncyclopediaEntryDto[] {
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    const next = [...entries];
    next[index] = entry;
    return next;
  }
  return [...entries, entry];
}

function upsertEdge(edges: SessionEdge[], edge: SessionEdge | null): SessionEdge[] {
  if (!edge) return edges;
  if (edges.some((item) => item.id === edge.id)) return edges;
  return [...edges, edge];
}

export function EnciclopediaProvider({ children }: { children: ReactNode }) {
  const [sessionEntries, setSessionEntries] = useState<EncyclopediaEntryDto[]>(
    [],
  );
  const [sessionEdges, setSessionEdges] = useState<SessionEdge[]>([]);
  const [currentEntry, setCurrentEntry] = useState<EncyclopediaEntryDto | null>(
    null,
  );
  const [explorationStack, setExplorationStack] = useState<
    EncyclopediaEntryDto[]
  >([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exploreConcept = useCallback(
    async (
      concept: string,
      options?: {
        parentEntryId?: string;
        triggerTerm?: string;
        asRoot?: boolean;
      },
    ) => {
      const trimmed = concept.trim();
      if (!trimmed) {
        setError("Escribí un concepto para explorar.");
        return;
      }

      if (
        sessionEntries.length >= MAX_SESSION_NODES &&
        !sessionEntries.some(
          (entry) =>
            entry.slug === trimmed.toLowerCase() ||
            entry.title.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        setError(`Máximo ${MAX_SESSION_NODES} conceptos por sesión.`);
        return;
      }

      setIsBusy(true);
      setError(null);

      try {
        const parentEntryId = options?.asRoot
          ? undefined
          : (options?.parentEntryId ?? currentEntry?.id ?? undefined);

        const response = await fetch("/api/enciclopedia/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept: trimmed,
            parentEntryId,
            triggerTerm: options?.triggerTerm ?? trimmed,
          }),
        });

        const payload = (await response.json()) as {
          entry?: EncyclopediaEntryDto;
          edge?: SessionEdge | null;
          error?: string;
        };

        if (!response.ok || !payload.entry) {
          throw new Error(payload.error ?? "No se pudo explorar el concepto.");
        }

        setSessionEntries((prev) => upsertEntry(prev, payload.entry!));
        setSessionEdges((prev) => upsertEdge(prev, payload.edge ?? null));
        setCurrentEntry(payload.entry);
        setExplorationStack((prev) => {
          if (options?.asRoot) {
            return [payload.entry!];
          }
          if (prev.some((item) => item.id === payload.entry!.id)) {
            return prev;
          }
          return [...prev, payload.entry!];
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setIsBusy(false);
      }
    },
    [currentEntry?.id, sessionEntries],
  );

  const selectEntry = useCallback(
    (entryId: string) => {
      const entry = sessionEntries.find((item) => item.id === entryId);
      if (entry) {
        setCurrentEntry(entry);
      }
    },
    [sessionEntries],
  );

  const goBack = useCallback(() => {
    setExplorationStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      setCurrentEntry(next[next.length - 1] ?? null);
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    setSessionEntries([]);
    setSessionEdges([]);
    setCurrentEntry(null);
    setExplorationStack([]);
    setError(null);
    setIsBusy(false);
  }, []);

  const submitReportFn = useCallback(
    async (type: EncyclopediaReportType, comment?: string) => {
      if (!currentEntry) return;

      setIsBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/enciclopedia/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId: currentEntry.id,
            type,
            comment,
          }),
        });

        const payload = (await response.json()) as {
          entry?: EncyclopediaEntryDto;
          error?: string;
        };

        if (!response.ok || !payload.entry) {
          throw new Error(payload.error ?? "No se pudo enviar el reporte.");
        }

        setSessionEntries((prev) => upsertEntry(prev, payload.entry!));
        setCurrentEntry(payload.entry);
        setExplorationStack((prev) =>
          prev.map((item) =>
            item.id === payload.entry!.id ? payload.entry! : item,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setIsBusy(false);
      }
    },
    [currentEntry],
  );

  const linkToCorpus = useCallback(
    async (
      targets: {
        nodeId: string;
        relationType: string;
        context?: string;
      }[],
    ) => {
      if (!currentEntry) return;

      setIsBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/enciclopedia/link-corpus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId: currentEntry.id,
            targets,
          }),
        });

        const payload = (await response.json()) as {
          kgNodeId?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo vincular al Corpus.");
        }

        const updated: EncyclopediaEntryDto = {
          ...currentEntry,
          kgNodeId: payload.kgNodeId ?? currentEntry.kgNodeId,
        };

        setSessionEntries((prev) => upsertEntry(prev, updated));
        setCurrentEntry(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setIsBusy(false);
      }
    },
    [currentEntry],
  );

  const value = useMemo(
    () => ({
      sessionEntries,
      sessionEdges,
      currentEntry,
      explorationStack,
      isBusy,
      error,
      exploreConcept,
      selectEntry,
      goBack,
      resetSession,
      submitReport: submitReportFn,
      linkToCorpus,
    }),
    [
      sessionEntries,
      sessionEdges,
      currentEntry,
      explorationStack,
      isBusy,
      error,
      exploreConcept,
      selectEntry,
      goBack,
      resetSession,
      submitReportFn,
      linkToCorpus,
    ],
  );

  return (
    <EnciclopediaContext.Provider value={value}>
      {children}
    </EnciclopediaContext.Provider>
  );
}

export function useEnciclopedia() {
  const context = useContext(EnciclopediaContext);
  if (!context) {
    throw new Error("useEnciclopedia debe usarse dentro de EnciclopediaProvider.");
  }
  return context;
}
