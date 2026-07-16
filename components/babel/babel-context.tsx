"use client";

import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import type { UniverseDto } from "@/lib/babel/types";
import type { DayOffset } from "@/lib/pendientes/types";
import { fetchWithUniverse } from "@/lib/babel/universe-fetch";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "deprocast-active-universe";

type BabelContextValue = {
  activeUniverse: UniverseDto | null;
  universeSlug: string;
  universes: UniverseDto[];
  selectedDay: DayOffset;
  temporalVersion: number;
  plannerMode: "week" | "month";
  weekAnchor: Date;
  monthAnchor: { year: number; month: number };
  isLoading: boolean;
  setSelectedDay: (day: DayOffset) => void;
  bumpTemporal: () => void;
  setPlannerMode: (mode: "week" | "month") => void;
  setWeekAnchor: (date: Date) => void;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  setMonthAnchor: (year: number, month: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  switchUniverse: (slug: string) => void;
  discoverUniverse: (label: string) => Promise<UniverseDto | null>;
  calibrateUniverse: (slug: string, weight: number) => Promise<void>;
  refreshUniverses: () => Promise<void>;
  universeFetch: (
    path: string,
    init?: import("@/lib/babel/universe-fetch").UniverseFetchInit,
  ) => Promise<Response>;
};

const BabelContext = createContext<BabelContextValue | null>(null);

export function BabelProvider({ children }: { children: React.ReactNode }) {
  const [universes, setUniverses] = useState<UniverseDto[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>(ROOT_UNIVERSE_SLUG);
  const [selectedDay, setSelectedDay] = useState<DayOffset>("today");
  const [temporalVersion, setTemporalVersion] = useState(0);
  const [plannerMode, setPlannerMode] = useState<"week" | "month">("week");
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [monthAnchor, setMonthAnchorState] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUniverses = useCallback(async () => {
    const response = await fetch("/api/universos", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { universos?: UniverseDto[] };
    setUniverses(data.universos ?? []);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveSlug(stored);

    void (async () => {
      setIsLoading(true);
      await refreshUniverses();
      setIsLoading(false);
    })();
  }, [refreshUniverses]);

  const activeUniverse = useMemo(
    () => universes.find((u) => u.slug === activeSlug) ?? universes[0] ?? null,
    [universes, activeSlug],
  );

  const universeSlug = activeUniverse?.slug ?? activeSlug ?? ROOT_UNIVERSE_SLUG;

  const universeFetch = useCallback(
    (path: string, init?: Parameters<typeof fetchWithUniverse>[1]) =>
      fetchWithUniverse(path, { ...init, universeSlug }),
    [universeSlug],
  );

  const switchUniverse = useCallback((slug: string) => {
    setActiveSlug(slug);
    localStorage.setItem(STORAGE_KEY, slug);
  }, []);

  const discoverUniverse = useCallback(
    async (label: string): Promise<UniverseDto | null> => {
      const response = await fetch("/api/universos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = (await response.json()) as {
        universo?: UniverseDto;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo descubrir el universo.");
      }
      if (data.universo) {
        setUniverses((prev) => [...prev, data.universo!]);
        switchUniverse(data.universo.slug);
      }
      return data.universo ?? null;
    },
    [switchUniverse],
  );

  const calibrateUniverse = useCallback(
    async (slug: string, weight: number) => {
      const response = await fetch(`/api/universos/${slug}/calibrate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trenchesWeight: weight }),
      });
      const data = (await response.json()) as { universo?: UniverseDto };
      if (!response.ok || !data.universo) return;
      setUniverses((prev) =>
        prev.map((u) => (u.slug === slug ? data.universo! : u)),
      );
    },
    [],
  );

  const bumpTemporal = useCallback(() => {
    setTemporalVersion((current) => current + 1);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setWeekAnchor((current) => new Date(current.getTime() - 7 * 86_400_000));
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekAnchor((current) => new Date(current.getTime() + 7 * 86_400_000));
  }, []);

  const setMonthAnchor = useCallback((year: number, month: number) => {
    setMonthAnchorState({ year, month });
  }, []);

  const goToPrevMonth = useCallback(() => {
    setMonthAnchorState((current) => {
      if (current.month === 1) return { year: current.year - 1, month: 12 };
      return { year: current.year, month: current.month - 1 };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonthAnchorState((current) => {
      if (current.month === 12) return { year: current.year + 1, month: 1 };
      return { year: current.year, month: current.month + 1 };
    });
  }, []);

  const value = useMemo(
    () => ({
      activeUniverse,
      universeSlug,
      universes,
      selectedDay,
      temporalVersion,
      plannerMode,
      weekAnchor,
      monthAnchor,
      isLoading,
      setSelectedDay,
      bumpTemporal,
      setPlannerMode,
      setWeekAnchor,
      goToPrevWeek,
      goToNextWeek,
      setMonthAnchor,
      goToPrevMonth,
      goToNextMonth,
      switchUniverse,
      discoverUniverse,
      calibrateUniverse,
      refreshUniverses,
      universeFetch,
    }),
    [
      activeUniverse,
      universeSlug,
      universes,
      selectedDay,
      temporalVersion,
      plannerMode,
      weekAnchor,
      monthAnchor,
      isLoading,
      bumpTemporal,
      setPlannerMode,
      goToPrevWeek,
      goToNextWeek,
      setMonthAnchor,
      goToPrevMonth,
      goToNextMonth,
      switchUniverse,
      discoverUniverse,
      calibrateUniverse,
      refreshUniverses,
      universeFetch,
    ],
  );

  return (
    <BabelContext.Provider value={value}>{children}</BabelContext.Provider>
  );
}

export function useBabel() {
  const ctx = useContext(BabelContext);
  if (!ctx) {
    throw new Error("useBabel debe usarse dentro de BabelProvider.");
  }
  return ctx;
}
