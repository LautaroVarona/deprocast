"use client";

import type {
  CastleCardDto,
  CastleCatalogItem,
  CastleCatalogSnapshot,
  CastleGridDto,
  CastleSnapshot,
  CastleSourceType,
} from "@/lib/castillo/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CastilloContextValue = {
  snapshot: CastleSnapshot | null;
  catalog: CastleCatalogSnapshot | null;
  activeGridId: string | null;
  isLoading: boolean;
  isBusy: boolean;
  error: string | null;
  catalogQuery: string;
  catalogFilter: CastleSourceType | "all";
  setCatalogQuery: (value: string) => void;
  setCatalogFilter: (value: CastleSourceType | "all") => void;
  refresh: () => Promise<void>;
  selectGrid: (gridId: string) => Promise<void>;
  createGrid: (name: string) => Promise<void>;
  placeItem: (item: CastleCatalogItem) => Promise<void>;
  updateCard: (
    cardId: string,
    patch: {
      tags?: string[];
      layout?: CastleCardDto["layout"];
      accent?: string | null;
      metadata?: Record<string, unknown>;
      emitClassificationEvent?: boolean;
    },
  ) => Promise<void>;
  removeCard: (cardId: string) => Promise<void>;
  filteredCatalog: CastleCatalogItem[];
};

const CastilloContext = createContext<CastilloContextValue | null>(null);

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Error de red.",
    );
  }
  return data as T;
}

export function CastilloProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<CastleSnapshot | null>(null);
  const [catalog, setCatalog] = useState<CastleCatalogSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CastleSourceType | "all">(
    "all",
  );

  const activeGridId = snapshot?.activeGridId ?? null;

  const loadCatalog = useCallback(async (gridId: string) => {
    const data = await fetchJson<CastleCatalogSnapshot>(
      `/api/castillo/catalog?gridId=${gridId}`,
    );
    setCatalog(data);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const gridParam = snapshot?.activeGridId
        ? `?gridId=${snapshot.activeGridId}`
        : "";
      const data = await fetchJson<CastleSnapshot>(`/api/castillo${gridParam}`);
      setSnapshot(data);
      await loadCatalog(data.activeGridId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar.");
    }
  }, [loadCatalog, snapshot?.activeGridId]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        const data = await fetchJson<CastleSnapshot>("/api/castillo");
        setSnapshot(data);
        await loadCatalog(data.activeGridId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadCatalog]);

  const selectGrid = useCallback(
    async (gridId: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const data = await fetchJson<CastleSnapshot>(
          `/api/castillo?gridId=${gridId}`,
        );
        setSnapshot(data);
        await loadCatalog(data.activeGridId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cambiar grid.");
      } finally {
        setIsBusy(false);
      }
    },
    [loadCatalog],
  );

  const createGrid = useCallback(
    async (name: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const grid = await fetchJson<CastleGridDto>("/api/castillo/grids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        await selectGrid(grid.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear grid.");
      } finally {
        setIsBusy(false);
      }
    },
    [selectGrid],
  );

  const placeItem = useCallback(
    async (item: CastleCatalogItem) => {
      if (!activeGridId) return;
      setIsBusy(true);
      setError(null);
      try {
        await fetchJson("/api/castillo/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gridId: activeGridId,
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            title: item.title,
            subtitle: item.subtitle,
            accent: item.accentHint,
            metadata: item.meta ?? {},
          }),
        });
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo colocar.");
      } finally {
        setIsBusy(false);
      }
    },
    [activeGridId, refresh],
  );

  const updateCard = useCallback(
    async (
      cardId: string,
      patch: {
        tags?: string[];
        layout?: CastleCardDto["layout"];
        accent?: string | null;
        metadata?: Record<string, unknown>;
        emitClassificationEvent?: boolean;
      },
    ) => {
      setError(null);
      try {
        const card = await fetchJson<CastleCardDto>(
          `/api/castillo/cards/${cardId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          },
        );
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                cards: prev.cards.map((item) =>
                  item.id === cardId ? card : item,
                ),
              }
            : prev,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    },
    [],
  );

  const removeCard = useCallback(
    async (cardId: string) => {
      setIsBusy(true);
      setError(null);
      try {
        await fetchJson(`/api/castillo/cards/${cardId}`, { method: "DELETE" });
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo quitar.");
      } finally {
        setIsBusy(false);
      }
    },
    [refresh],
  );

  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    const query = catalogQuery.trim().toLowerCase();
    return catalog.items.filter((item) => {
      if (catalogFilter !== "all" && item.sourceType !== catalogFilter) {
        return false;
      }
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        (item.subtitle?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [catalog, catalogFilter, catalogQuery]);

  const value = useMemo(
    () => ({
      snapshot,
      catalog,
      activeGridId,
      isLoading,
      isBusy,
      error,
      catalogQuery,
      catalogFilter,
      setCatalogQuery,
      setCatalogFilter,
      refresh,
      selectGrid,
      createGrid,
      placeItem,
      updateCard,
      removeCard,
      filteredCatalog,
    }),
    [
      snapshot,
      catalog,
      activeGridId,
      isLoading,
      isBusy,
      error,
      catalogQuery,
      catalogFilter,
      refresh,
      selectGrid,
      createGrid,
      placeItem,
      updateCard,
      removeCard,
      filteredCatalog,
    ],
  );

  return (
    <CastilloContext.Provider value={value}>{children}</CastilloContext.Provider>
  );
}

export function useCastillo() {
  const context = useContext(CastilloContext);
  if (!context) {
    throw new Error("useCastillo debe usarse dentro de CastilloProvider.");
  }
  return context;
}
