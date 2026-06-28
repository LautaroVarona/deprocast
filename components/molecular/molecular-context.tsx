"use client";

import type {
  ParticulaConPropuesta,
  ParticulaMetadata,
  ParticulaValidada,
  PipelinePhase,
} from "@/lib/molecular-processing/types";
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

type MolecularContextValue = {
  phase: PipelinePhase;
  textoOriginal: string;
  fuenteOrigen: string;
  particulas: ParticulaMetadata[];
  calibraciones: ParticulaConPropuesta[];
  validadas: ParticulaValidada[];
  error: string | null;
  isBusy: boolean;
  setTextoOriginal: (text: string) => void;
  setFuenteOrigen: (source: string) => void;
  runChunker: () => Promise<void>;
  runCalibrator: () => Promise<void>;
  validateParticula: (
    particulaId: string,
    axes: {
      ejeX: ParticulaConPropuesta["propuesta"]["ejeX"];
      ejeY: number;
      ejeZ: number;
    },
  ) => Promise<void>;
  resetPipeline: () => void;
};

const MolecularContext = createContext<MolecularContextValue | null>(null);

async function fetchCalibrations(
  source: ParticulaMetadata[],
): Promise<ParticulaConPropuesta[]> {
  const response = await fetch("/api/molecular/calibrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ particulas: source }),
  });

  const payload = (await response.json()) as {
    particulas?: ParticulaConPropuesta[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Falló el calibrador central.");
  }

  return payload.particulas ?? [];
}

export function MolecularProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [textoOriginal, setTextoOriginal] = useState("");
  const [fuenteOrigen, setFuenteOrigen] = useState("ingesta-manual");
  const [particulas, setParticulas] = useState<ParticulaMetadata[]>([]);
  const [calibraciones, setCalibraciones] = useState<ParticulaConPropuesta[]>(
    [],
  );
  const [validadas, setValidadas] = useState<ParticulaValidada[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const pendingCalibrateRef = useRef<ParticulaMetadata[] | null>(null);

  const resetPipeline = useCallback(() => {
    setPhase("idle");
    setParticulas([]);
    setCalibraciones([]);
    setValidadas([]);
    setError(null);
    setIsBusy(false);
    pendingCalibrateRef.current = null;
  }, []);

  const runCalibrator = useCallback(async () => {
    const source = pendingCalibrateRef.current ?? particulas;
    if (source.length === 0) return;

    setError(null);
    setIsBusy(true);
    setPhase("calibrating");

    try {
      const result = await fetchCalibrations(source);
      setCalibraciones(result);
      setPhase("validating");
      pendingCalibrateRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setPhase("disintegrating");
    } finally {
      setIsBusy(false);
    }
  }, [particulas]);

  const runChunker = useCallback(async () => {
    if (!textoOriginal.trim()) {
      setError("Pegá texto denso antes de iniciar el chunkeo.");
      return;
    }

    setError(null);
    setIsBusy(true);
    setPhase("chunking");
    setParticulas([]);
    setCalibraciones([]);
    setValidadas([]);
    pendingCalibrateRef.current = null;

    try {
      const response = await fetch("/api/molecular/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoOriginal, fuenteOrigen }),
      });

      const payload = (await response.json()) as {
        particulas?: ParticulaMetadata[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Falló el chunkeador semántico.");
      }

      const chunks = payload.particulas ?? [];
      setParticulas(chunks);
      pendingCalibrateRef.current = chunks;
      setPhase("disintegrating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setPhase("idle");
    } finally {
      setIsBusy(false);
    }
  }, [textoOriginal, fuenteOrigen]);

  useEffect(() => {
    if (phase !== "disintegrating" || !pendingCalibrateRef.current?.length) return;

    const timer = window.setTimeout(() => {
      void runCalibrator();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [phase, runCalibrator]);

  const validateParticula = useCallback(
    async (
      particulaId: string,
      axes: {
        ejeX: ParticulaConPropuesta["propuesta"]["ejeX"];
        ejeY: number;
        ejeZ: number;
      },
    ) => {
      const target = calibraciones.find((item) => item.id === particulaId);
      if (!target) return;

      setIsBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/molecular/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            particula: {
              ...target,
              ejeX: axes.ejeX,
              ejeY: axes.ejeY,
              ejeZ: axes.ejeZ,
              propuestaOriginal: target.propuesta,
            },
          }),
        });

        const payload = (await response.json()) as {
          particula?: ParticulaValidada;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo validar la partícula.");
        }

        if (payload.particula) {
          setValidadas((prev) => [...prev, payload.particula!]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setIsBusy(false);
      }
    },
    [calibraciones],
  );

  useEffect(() => {
    if (
      phase === "validating" &&
      calibraciones.length > 0 &&
      validadas.length === calibraciones.length
    ) {
      setPhase("complete");
    }
  }, [phase, calibraciones.length, validadas.length]);

  const value = useMemo(
    () => ({
      phase,
      textoOriginal,
      fuenteOrigen,
      particulas,
      calibraciones,
      validadas,
      error,
      isBusy,
      setTextoOriginal,
      setFuenteOrigen,
      runChunker,
      runCalibrator,
      validateParticula,
      resetPipeline,
    }),
    [
      phase,
      textoOriginal,
      fuenteOrigen,
      particulas,
      calibraciones,
      validadas,
      error,
      isBusy,
      runChunker,
      runCalibrator,
      validateParticula,
      resetPipeline,
    ],
  );

  return (
    <MolecularContext.Provider value={value}>
      {children}
    </MolecularContext.Provider>
  );
}

export function useMolecular() {
  const ctx = useContext(MolecularContext);
  if (!ctx) {
    throw new Error("useMolecular debe usarse dentro de MolecularProvider.");
  }
  return ctx;
}
