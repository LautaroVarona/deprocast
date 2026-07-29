"use client";

import {
  getYoAction,
  hydrateYoFromClientSnapshotAction,
} from "@/app/yo/actions";
import {
  readClientYoSnapshot,
  writeClientYoSnapshot,
} from "@/lib/yo/client-snapshot";
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

const GENESIS_RANK: Record<GenesisStatus, number> = {
  PENDING_NAMES: 0,
  PENDING_MISSIONS: 1,
  COMPLETED: 2,
};

function hasBaptismNames(yo: YoDto | null | undefined): boolean {
  return Boolean(yo?.operatorName?.trim() && yo?.exocortexName?.trim());
}

/** Elige la lectura más avanzada / con identidad (nunca preferir shell vacío). */
function pickPreferredYo(a: YoDto | null, b: YoDto | null): YoDto | null {
  if (!a) return b;
  if (!b) return a;

  const aNames = hasBaptismNames(a);
  const bNames = hasBaptismNames(b);
  if (aNames && !bNames) return a;
  if (bNames && !aNames) return b;

  const aRank = GENESIS_RANK[a.genesisStatus];
  const bRank = GENESIS_RANK[b.genesisStatus];
  if (bRank !== aRank) return bRank > aRank ? b : a;

  return b.updatedAt > a.updatedAt ? b : a;
}

/**
 * Nunca regresar a bautismo si ya hay nombres en memoria.
 * Tampoco bajar de COMPLETED por una revalidación intermitente (Senado, API).
 * Solo un wipe (o PC nuevo) debe volver a PENDING_NAMES.
 */
function shouldKeepPrevious(prev: YoDto | null, next: YoDto): boolean {
  if (!prev) return false;
  if (!hasBaptismNames(prev)) return false;
  if (!hasBaptismNames(next)) return true;
  if (prev.genesisStatus === "COMPLETED" && next.genesisStatus !== "COMPLETED") {
    return true;
  }
  return next.genesisStatus === "PENDING_NAMES";
}

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
  const [everCompleted, setEverCompleted] = useState(false);
  const wasCompletedRef = useRef(false);
  const yoRef = useRef<YoDto | null>(null);
  const hydratedRef = useRef(false);

  const applyYo = useCallback((next: YoDto) => {
    setYo((prev) => {
      if (shouldKeepPrevious(prev, next)) {
        yoRef.current = prev;
        if (prev) writeClientYoSnapshot(prev);
        return prev;
      }

      const wasComplete =
        wasCompletedRef.current || prev?.genesisStatus === "COMPLETED";
      const nowComplete = next.genesisStatus === "COMPLETED";
      if (!wasComplete && nowComplete) {
        setNavRevealToken((token) => token + 1);
      }
      if (nowComplete) {
        wasCompletedRef.current = true;
        setEverCompleted(true);
      }
      yoRef.current = next;
      writeClientYoSnapshot(next);
      return next;
    });
  }, []);

  const refreshGenesis = useCallback(async () => {
    // Primero: empujar ancla del navegador si el servidor está vacío.
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const local = readClientYoSnapshot();
      if (local?.operatorName && local.exocortexName) {
        if (local.genesisCompletedAt) {
          wasCompletedRef.current = true;
          setEverCompleted(true);
        }
        const hydrated = await hydrateYoFromClientSnapshotAction(local);
        if (hydrated.ok) {
          applyYo(hydrated.data);
          setReady(true);
          return hydrated.data;
        }
      }
    }

    const result = await getYoAction();
    let next = result.ok ? result.data : null;

    // Contrastar con REST por si action/API ven estados distintos.
    const apiYo = await fetchYoFromApi();
    next = pickPreferredYo(next, apiYo);

    if (!next) {
      setReady(true);
      return yoRef.current;
    }

    if (shouldKeepPrevious(yoRef.current, next)) {
      setReady(true);
      return yoRef.current;
    }

    if (next.genesisStatus === "COMPLETED") {
      wasCompletedRef.current = true;
      setEverCompleted(true);
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
      navigationUnlocked: everCompleted || genesisStatus === "COMPLETED",
      navRevealToken,
      refreshGenesis,
      applyYo,
    }),
    [
      ready,
      yo,
      genesisStatus,
      everCompleted,
      navRevealToken,
      refreshGenesis,
      applyYo,
    ],
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
