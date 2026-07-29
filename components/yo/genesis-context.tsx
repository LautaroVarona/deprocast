"use client";

import { getYoAction } from "@/app/yo/actions";
import type { GenesisStatus, YoDto } from "@/lib/yo/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type GenesisContextValue = {
  ready: boolean;
  yo: YoDto | null;
  genesisStatus: GenesisStatus;
  /** true solo cuando COMPLETED — libera AppHeader y Command Palette. */
  navigationUnlocked: boolean;
  /** Incrementa al pasar a COMPLETED para animar el reveal del header. */
  navRevealToken: number;
  refreshGenesis: () => Promise<YoDto | null>;
  applyYo: (yo: YoDto) => void;
};

const GenesisContext = createContext<GenesisContextValue | null>(null);

async function fetchYoFromApi(): Promise<YoDto | null> {
  try {
    const res = await fetch("/api/yo", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { yo?: YoDto };
    return data.yo ?? null;
  } catch {
    return null;
  }
}

export function GenesisProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [yo, setYo] = useState<YoDto | null>(null);
  const [navRevealToken, setNavRevealToken] = useState(0);
  const wasCompletedRef = useRef(false);

  const applyYo = useCallback((next: YoDto) => {
    setYo((prev) => {
      const wasComplete =
        wasCompletedRef.current || prev?.genesisStatus === "COMPLETED";
      const nowComplete = next.genesisStatus === "COMPLETED";
      if (!wasComplete && nowComplete) {
        setNavRevealToken((token) => token + 1);
      }
      if (nowComplete) wasCompletedRef.current = true;
      return next;
    });
  }, []);

  const refreshGenesis = useCallback(async () => {
    const result = await getYoAction();
    let next = result.ok ? result.data : null;

    // Contrastar con REST: en Vercel server action y API pueden ver DBs distintas.
    const apiYo = await fetchYoFromApi();
    if (apiYo) {
      if (!next) {
        next = apiYo;
      } else if (
        next.genesisStatus === "COMPLETED" &&
        apiYo.genesisStatus !== "COMPLETED"
      ) {
        // Action vio sellado fantasma; el API (lista/grafo) está vacío.
        next = apiYo;
      } else if (
        apiYo.genesisStatus === "COMPLETED" &&
        next.genesisStatus !== "COMPLETED"
      ) {
        next = apiYo;
      }
    }

    if (!next) {
      setReady(true);
      return null;
    }

    if (next.genesisStatus === "COMPLETED") {
      wasCompletedRef.current = true;
    } else {
      wasCompletedRef.current = false;
    }
    applyYo(next);
    setReady(true);
    return next;
  }, [applyYo]);

  useEffect(() => {
    void refreshGenesis();
  }, [refreshGenesis]);

  const genesisStatus: GenesisStatus = yo?.genesisStatus ?? "PENDING_NAMES";

  const value = useMemo<GenesisContextValue>(
    () => ({
      ready,
      yo,
      genesisStatus,
      navigationUnlocked: genesisStatus === "COMPLETED",
      navRevealToken,
      refreshGenesis,
      applyYo,
    }),
    [ready, yo, genesisStatus, navRevealToken, refreshGenesis, applyYo],
  );

  return (
    <GenesisContext.Provider value={value}>{children}</GenesisContext.Provider>
  );
}

export function useGenesis(): GenesisContextValue {
  const ctx = useContext(GenesisContext);
  if (!ctx) {
    throw new Error("useGenesis debe usarse dentro de GenesisProvider.");
  }
  return ctx;
}
