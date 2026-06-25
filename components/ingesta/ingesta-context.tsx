"use client";

import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import {
  type SourceType,
} from "@/lib/document-constants";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type IngestaChannel = "texto" | "audio" | "tablas" | "vision" | "x-bookmarks";

export type IngestaGravity = {
  title: string;
  campoSlug: CampoSlug;
  onda: string;
  sourceType: SourceType;
};

type IngestaContextValue = {
  gravity: IngestaGravity;
  setGravity: (patch: Partial<IngestaGravity>) => void;
  resetGravity: () => void;
  campos: CampoInfo[];
  activeChannel: IngestaChannel;
  setActiveChannel: (channel: IngestaChannel) => void;
};

const DEFAULT_GRAVITY: IngestaGravity = {
  title: "",
  campoSlug: DEFAULT_CAMPO_SLUG,
  onda: "sin-clasificar",
  sourceType: "ai_chat",
};

const IngestaContext = createContext<IngestaContextValue | null>(null);

export function IngestaProvider({ children }: { children: ReactNode }) {
  const [gravity, setGravityState] = useState<IngestaGravity>(DEFAULT_GRAVITY);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [activeChannel, setActiveChannel] = useState<IngestaChannel>("texto");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/proyectos", { cache: "no-store" });
        if (!response.ok) return;
        const data: { campos?: CampoInfo[] } = await response.json();
        if (!data.campos?.length) return;
        setCampos(data.campos);
        setGravityState((current) =>
          data.campos!.some((campo) => campo.slug === current.campoSlug)
            ? current
            : {
                ...current,
                campoSlug:
                  data.campos!.find((campo) => campo.slug === DEFAULT_CAMPO_SLUG)
                    ?.slug ?? data.campos![0].slug,
              },
        );
      } catch {
        // Default local
      }
    })();
  }, []);

  const setGravity = useCallback((patch: Partial<IngestaGravity>) => {
    setGravityState((current) => ({ ...current, ...patch }));
  }, []);

  const resetGravity = useCallback(() => {
    setGravityState(DEFAULT_GRAVITY);
  }, []);

  const value = useMemo(
    () => ({
      gravity,
      setGravity,
      resetGravity,
      campos,
      activeChannel,
      setActiveChannel,
    }),
    [gravity, setGravity, resetGravity, campos, activeChannel],
  );

  return (
    <IngestaContext.Provider value={value}>{children}</IngestaContext.Provider>
  );
}

export function useIngesta() {
  const context = useContext(IngestaContext);
  if (!context) {
    throw new Error("useIngesta debe usarse dentro de IngestaProvider");
  }
  return context;
}
