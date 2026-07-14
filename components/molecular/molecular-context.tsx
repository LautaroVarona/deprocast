"use client";

import { useBabel } from "@/components/babel/babel-context";
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

export type MolecularSourceOption = {
  id: string;
  title: string;
  kind: string;
  fuenteOrigen: string;
  charCount: number;
  createdAt: string;
  strongestTag: { label: string; weight: number } | null;
};

export type BatchDocument = {
  id: string;
  title: string;
  fuenteOrigen: string;
};

type MolecularContextValue = {
  phase: PipelinePhase;
  textoOriginal: string;
  fuenteOrigen: string;
  particulas: ParticulaMetadata[];
  calibraciones: ParticulaConPropuesta[];
  validadas: ParticulaValidada[];
  error: string | null;
  isBusy: boolean;
  inputMode: "manual" | "archivo";
  selectedSourceId: string | null;
  availableSources: MolecularSourceOption[];
  isLoadingSources: boolean;
  batchMode: boolean;
  batchQueue: BatchDocument[];
  batchIndex: number;
  setTextoOriginal: (text: string) => void;
  setFuenteOrigen: (source: string) => void;
  setInputMode: (mode: "manual" | "archivo") => void;
  setSelectedSourceId: (id: string | null) => void;
  loadSources: () => Promise<void>;
  loadSourceContent: (sourceId: string) => Promise<void>;
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
  startBatchCalibration: () => Promise<void>;
  stopBatchCalibration: () => void;
  skipBatchDocument: () => void;
};

const MolecularContext = createContext<MolecularContextValue | null>(null);

async function fetchCalibrations(
  source: ParticulaMetadata[],
  universeFetch: ReturnType<typeof useBabel>["universeFetch"],
): Promise<ParticulaConPropuesta[]> {
  const response = await universeFetch("/api/molecular/calibrate", {
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

async function fetchArchivoContent(
  sourceId: string,
  universeFetch: ReturnType<typeof useBabel>["universeFetch"],
): Promise<{
  content: string;
  fuenteOrigen: string;
  title: string;
}> {
  const response = await universeFetch(
    `/api/archivo/${encodeURIComponent(sourceId)}`,
  );
  const payload = (await response.json()) as {
    item?: { content: string; fuenteOrigen: string; title: string };
    error?: string;
  };

  if (!response.ok || !payload.item) {
    throw new Error(payload.error ?? "No se pudo cargar el documento.");
  }

  return payload.item;
}

export function MolecularProvider({ children }: { children: ReactNode }) {
  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();
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

  const [inputMode, setInputMode] = useState<"manual" | "archivo">("manual");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<MolecularSourceOption[]>(
    [],
  );
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchDocument[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);

  const pendingCalibrateRef = useRef<ParticulaMetadata[] | null>(null);
  const batchAdvanceRef = useRef(false);
  const batchModeRef = useRef(false);
  const advanceBatchRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    batchModeRef.current = batchMode;
  }, [batchMode]);

  const resetPipeline = useCallback(() => {
    setPhase("idle");
    setParticulas([]);
    setCalibraciones([]);
    setValidadas([]);
    setError(null);
    setIsBusy(false);
    pendingCalibrateRef.current = null;
    batchAdvanceRef.current = false;
  }, []);

  const stopBatchCalibration = useCallback(() => {
    setBatchMode(false);
    setBatchQueue([]);
    setBatchIndex(0);
    batchAdvanceRef.current = false;
    resetPipeline();
  }, [resetPipeline]);

  useEffect(() => {
    resetPipeline();
    setTextoOriginal("");
    setAvailableSources([]);
    setSelectedSourceId(null);
    setBatchMode(false);
    setBatchQueue([]);
    setBatchIndex(0);
  }, [universeSlug, resetPipeline]);

  const loadSources = useCallback(async () => {
    setIsLoadingSources(true);
    try {
      const response = await universeFetch("/api/molecular/sources", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        sources?: MolecularSourceOption[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar fuentes.");
      }
      setAvailableSources(payload.sources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar fuentes.");
    } finally {
      setIsLoadingSources(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void loadSources();
  }, [loadSources, universeSlug, isUniverseLoading]);

  const loadSourceContent = useCallback(async (sourceId: string) => {
    setError(null);
    setIsBusy(true);
    try {
      const item = await fetchArchivoContent(sourceId, universeFetch);
      setSelectedSourceId(sourceId);
      setTextoOriginal(item.content);
      setFuenteOrigen(item.fuenteOrigen);
      setInputMode("archivo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsBusy(false);
    }
  }, [universeFetch]);

  const runChunkerInternal = useCallback(
    async (texto: string, fuente: string) => {
      if (!texto.trim()) {
        setError("El documento no tiene texto procesable.");
        if (batchModeRef.current) {
          window.setTimeout(() => {
            void advanceBatchRef.current?.();
          }, 800);
        }
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
        const response = await universeFetch("/api/molecular/chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto, fuenteOrigen: fuente }),
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
        if (chunks.length === 0) {
          setError("El chunkeador no emitió partículas para este documento.");
          setPhase("idle");
          if (batchModeRef.current) {
            window.setTimeout(() => {
              void advanceBatchRef.current?.();
            }, 800);
          }
          return;
        }
        setPhase("disintegrating");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
        setPhase("idle");
        if (batchModeRef.current) {
          window.setTimeout(() => {
            void advanceBatchRef.current?.();
          }, 800);
        }
      } finally {
        setIsBusy(false);
      }
    },
    [universeFetch],
  );

  const runCalibrator = useCallback(async () => {
    const source = pendingCalibrateRef.current ?? particulas;
    if (source.length === 0) return;

    setError(null);
    setIsBusy(true);
    setPhase("calibrating");

    try {
      const result = await fetchCalibrations(source, universeFetch);
      setCalibraciones(result);
      setPhase("validating");
      pendingCalibrateRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setPhase("disintegrating");
    } finally {
      setIsBusy(false);
    }
  }, [particulas, universeFetch]);

  const runChunker = useCallback(async () => {
    await runChunkerInternal(textoOriginal, fuenteOrigen);
  }, [textoOriginal, fuenteOrigen, runChunkerInternal]);

  const processBatchDocument = useCallback(
    async (index: number, queue: BatchDocument[]) => {
      const doc = queue[index];
      if (!doc) {
        setBatchMode(false);
        setPhase("idle");
        return;
      }

      setBatchIndex(index);
      setError(null);

      try {
        const item = await fetchArchivoContent(doc.id, universeFetch);
        setSelectedSourceId(doc.id);
        setTextoOriginal(item.content);
        setFuenteOrigen(item.fuenteOrigen);
        setInputMode("archivo");
        await runChunkerInternal(item.content, item.fuenteOrigen);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Error en documento ${doc.title}.`,
        );
        setPhase("idle");
        if (batchModeRef.current) {
          window.setTimeout(() => {
            void advanceBatchRef.current?.();
          }, 800);
        }
      }
    },
    [runChunkerInternal, universeFetch],
  );

  const advanceBatch = useCallback(async () => {
    if (!batchMode || batchQueue.length === 0) return;

    const nextIndex = batchIndex + 1;
    if (nextIndex >= batchQueue.length) {
      setBatchMode(false);
      setPhase("complete");
      return;
    }

    batchAdvanceRef.current = true;
    setParticulas([]);
    setCalibraciones([]);
    setValidadas([]);
    pendingCalibrateRef.current = null;
    await processBatchDocument(nextIndex, batchQueue);
    batchAdvanceRef.current = false;
  }, [batchMode, batchIndex, batchQueue, processBatchDocument]);

  useEffect(() => {
    advanceBatchRef.current = advanceBatch;
  }, [advanceBatch]);

  const startBatchCalibration = useCallback(async () => {
    setError(null);
    setIsBusy(true);

    try {
      const response = await universeFetch("/api/molecular/sources", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        sources?: MolecularSourceOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar documentos.");
      }

      const queue: BatchDocument[] = (payload.sources ?? []).map((source) => ({
        id: source.id,
        title: source.title,
        fuenteOrigen: source.fuenteOrigen,
      }));

      if (queue.length === 0) {
        setError("No hay documentos en el sistema para calibrar.");
        return;
      }

      setBatchQueue(queue);
      setBatchMode(true);
      setBatchIndex(0);
      await processBatchDocument(0, queue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsBusy(false);
    }
  }, [processBatchDocument, universeFetch]);

  const skipBatchDocument = useCallback(() => {
    if (!batchMode) return;
    void advanceBatch();
  }, [batchMode, advanceBatch]);

  useEffect(() => {
    if (phase !== "disintegrating" || !pendingCalibrateRef.current?.length) return;

    const timer = window.setTimeout(() => {
      void runCalibrator();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [phase, runCalibrator]);

  useEffect(() => {
    if (
      phase === "validating" &&
      calibraciones.length > 0 &&
      validadas.length === calibraciones.length
    ) {
      setPhase("complete");
    }
  }, [phase, calibraciones.length, validadas.length]);

  useEffect(() => {
    if (phase !== "complete" || !batchMode) return;
    if (batchAdvanceRef.current) return;

    const timer = window.setTimeout(() => {
      void advanceBatch();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [phase, batchMode, advanceBatch]);

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
        const response = await universeFetch("/api/molecular/validate", {
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
    [calibraciones, universeFetch],
  );

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
      inputMode,
      selectedSourceId,
      availableSources,
      isLoadingSources,
      batchMode,
      batchQueue,
      batchIndex,
      setTextoOriginal,
      setFuenteOrigen,
      setInputMode,
      setSelectedSourceId,
      loadSources,
      loadSourceContent,
      runChunker,
      runCalibrator,
      validateParticula,
      resetPipeline,
      startBatchCalibration,
      stopBatchCalibration,
      skipBatchDocument,
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
      inputMode,
      selectedSourceId,
      availableSources,
      isLoadingSources,
      batchMode,
      batchQueue,
      batchIndex,
      loadSources,
      loadSourceContent,
      runChunker,
      runCalibrator,
      validateParticula,
      resetPipeline,
      startBatchCalibration,
      stopBatchCalibration,
      skipBatchDocument,
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
