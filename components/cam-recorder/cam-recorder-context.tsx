"use client";

import type {
  ConsciousnessNote,
  WatcherPhase,
} from "@/lib/cam-recorder-watcher/types";
import { createSessionId } from "@/lib/cam-recorder-watcher/utils";
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

type CamRecorderContextValue = {
  phase: WatcherPhase;
  videoFile: File | null;
  videoUrl: string | null;
  videoDurationSeconds: number;
  sessionId: string | null;
  notas: ConsciousnessNote[];
  activeNoteId: string | null;
  error: string | null;
  injectedAt: string | null;
  isBusy: boolean;
  loadVideo: (file: File) => void;
  clearVideo: () => void;
  runWatcher: () => Promise<void>;
  injectToDeprocast: () => Promise<void>;
  seekToNote: (note: ConsciousnessNote) => void;
  onVideoTimeUpdate: (seconds: number) => void;
  registerSeekHandler: (handler: ((seconds: number) => void) | null) => void;
  setVideoDurationSeconds: (seconds: number) => void;
};

const CamRecorderContext = createContext<CamRecorderContextValue | null>(null);

export function CamRecorderProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<WatcherPhase>("idle");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notas, setNotas] = useState<ConsciousnessNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [injectedAt, setInjectedAt] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const seekHandlerRef = useRef<((seconds: number) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const revokeUrl = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const clearVideo = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setVideoFile(null);
    setVideoUrl((current) => {
      revokeUrl(current);
      return null;
    });
    setVideoDurationSeconds(0);
    setSessionId(null);
    setNotas([]);
    setActiveNoteId(null);
    setError(null);
    setInjectedAt(null);
    setIsBusy(false);
  }, [revokeUrl]);

  const loadVideo = useCallback(
    (file: File) => {
      clearVideo();
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(url);
      setPhase("loaded");
    },
    [clearVideo],
  );

  const registerSeekHandler = useCallback(
    (handler: ((seconds: number) => void) | null) => {
      seekHandlerRef.current = handler;
    },
    [],
  );

  const seekToNote = useCallback((note: ConsciousnessNote) => {
    seekHandlerRef.current?.(note.timestampSeconds);
    setActiveNoteId(note.id);
  }, []);

  const onVideoTimeUpdate = useCallback(
    (seconds: number) => {
      if (notas.length === 0) return;

      let closest = notas[0];
      let minDelta = Math.abs(notas[0].timestampSeconds - seconds);

      for (const note of notas) {
        const delta = Math.abs(note.timestampSeconds - seconds);
        if (delta < minDelta) {
          minDelta = delta;
          closest = note;
        }
      }

      if (minDelta <= 3) {
        setActiveNoteId(closest.id);
      }
    },
    [notas],
  );

  const runWatcher = useCallback(async () => {
    if (!videoFile || videoDurationSeconds <= 0) {
      setError("Cargá un video válido antes de analizar.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setIsBusy(true);
    setPhase("analyzing");
    setNotas([]);
    setSessionId(null);
    setInjectedAt(null);

    const newSessionId = createSessionId();
    setSessionId(newSessionId);

    try {
      const response = await fetch("/api/cam-recorder/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: videoFile.name,
          durationSeconds: videoDurationSeconds,
          fileSizeBytes: videoFile.size,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Falló el análisis del watcher.");
      }

      if (!response.body) {
        throw new Error("El servidor no devolvió un stream de notas.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | { type: "session"; sessionId: string }
            | { type: "note"; note: ConsciousnessNote }
            | { type: "done" };

          if (event.type === "session") {
            setSessionId(event.sessionId);
          } else if (event.type === "note") {
            setNotas((current) => [...current, event.note]);
          } else if (event.type === "done") {
            setPhase("complete");
          }
        }
      }

      setPhase((current) => (current === "analyzing" ? "complete" : current));
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Error desconocido en el watcher.";
      setError(message);
      setPhase("error");
    } finally {
      setIsBusy(false);
    }
  }, [videoFile, videoDurationSeconds]);

  const injectToDeprocastAction = useCallback(async () => {
    if (!sessionId || !videoFile || notas.length === 0) {
      setError("No hay notas para inyectar.");
      return;
    }

    setError(null);
    setIsBusy(true);
    setPhase("injecting");

    try {
      const response = await fetch("/api/cam-recorder/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          videoFilename: videoFile.name,
          videoDurationSeconds,
          notas,
        }),
      });

      const payload = (await response.json()) as {
        injectedAt?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Falló la inyección a Deprocast.");
      }

      setInjectedAt(payload.injectedAt ?? new Date().toISOString());
      setPhase("injected");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo inyectar el bloque.";
      setError(message);
      setPhase("complete");
    } finally {
      setIsBusy(false);
    }
  }, [sessionId, videoFile, notas, videoDurationSeconds]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (videoUrl) revokeUrl(videoUrl);
    };
  }, [videoUrl, revokeUrl]);

  const value = useMemo(
    () => ({
      phase,
      videoFile,
      videoUrl,
      videoDurationSeconds,
      sessionId,
      notas,
      activeNoteId,
      error,
      injectedAt,
      isBusy,
      loadVideo,
      clearVideo,
      runWatcher,
      injectToDeprocast: injectToDeprocastAction,
      seekToNote,
      onVideoTimeUpdate,
      registerSeekHandler,
      setVideoDurationSeconds,
    }),
    [
      phase,
      videoFile,
      videoUrl,
      videoDurationSeconds,
      sessionId,
      notas,
      activeNoteId,
      error,
      injectedAt,
      isBusy,
      loadVideo,
      clearVideo,
      runWatcher,
      injectToDeprocastAction,
      seekToNote,
      onVideoTimeUpdate,
      registerSeekHandler,
    ],
  );

  return (
    <CamRecorderContext.Provider value={value}>
      {children}
    </CamRecorderContext.Provider>
  );
}

export function useCamRecorder() {
  const context = useContext(CamRecorderContext);
  if (!context) {
    throw new Error("useCamRecorder debe usarse dentro de CamRecorderProvider.");
  }
  return context;
}
