"use client";

import { DEFAULT_TRINCHERA_LOCAL } from "@/lib/trinchera/visual/defaults";
import {
  readTrincheraLocal,
  writeTrincheraLocal,
} from "@/lib/trinchera/visual/session-store";
import type { TrincheraVisualPrefs } from "@/lib/trinchera/visual/types";
import { DEFAULT_SOUND_LAB_PARAMS } from "@/lib/trinchera/sound-lab/constants";
import {
  persistSoundLabParams,
  readSoundLabSession,
} from "@/lib/trinchera/sound-lab/session-store";
import { useSoundLabEngine } from "@/lib/trinchera/sound-lab/use-sound-lab-engine";
import type {
  BreathingState,
  PulseVisualState,
  SoundLabMode,
  SoundLabParams,
} from "@/lib/trinchera/sound-lab/types";
import type {
  CompleteAssaultResult,
  LudusAssaultDto,
  TrincheraSnapshot,
} from "@/lib/ludus/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type TrincheraSessionContextValue = {
  hydrated: boolean;
  visual: TrincheraVisualPrefs;
  setVisual: (visual: TrincheraVisualPrefs) => void;
  assaultNotes: string;
  setAssaultNotes: (notes: string) => void;
  assaultTitle: string;
  setAssaultTitle: (title: string) => void;
  selectedBlock: number;
  setSelectedBlock: (minutes: number) => void;
  selectedMicrotaskId: string | null;
  setSelectedMicrotaskId: (id: string | null) => void;
  isPlaying: boolean;
  isSessionActive: boolean;
  isStarting: boolean;
  isCompleting: boolean;
  tabVisible: boolean;
  params: SoundLabParams;
  pulseVisual: PulseVisualState;
  breathingState: BreathingState | null;
  accumulatedPracticeSec: number;
  play: () => Promise<void>;
  stop: () => void;
  setMode: (mode: SoundLabMode) => void;
  updateParams: (patch: Partial<SoundLabParams>) => void;
  activeAssault: LudusAssaultDto | null;
  remainingSec: number;
  startSession: (snapshot: TrincheraSnapshot) => Promise<void>;
  finishSession: (completed: boolean) => Promise<void>;
};

const TrincheraSessionContext =
  createContext<TrincheraSessionContextValue | null>(null);

export function useTrincheraSession() {
  const ctx = useContext(TrincheraSessionContext);
  if (!ctx) {
    throw new Error(
      "useTrincheraSession debe usarse dentro de TrincheraSessionProvider",
    );
  }
  return ctx;
}

type TrincheraSessionProviderProps = {
  children: ReactNode;
  onRefresh: () => void;
};

export function TrincheraSessionProvider({
  children,
  onRefresh,
}: TrincheraSessionProviderProps) {
  const [hydrated, setHydrated] = useState(false);
  const [visual, setVisualState] = useState<TrincheraVisualPrefs>(
    DEFAULT_TRINCHERA_LOCAL.visual,
  );
  const [assaultNotes, setAssaultNotesState] = useState("");
  const [assaultTitle, setAssaultTitleState] = useState("");
  const [selectedBlock, setSelectedBlockState] = useState(25);
  const [selectedMicrotaskId, setSelectedMicrotaskIdState] = useState<
    string | null
  >(null);
  const [accumulatedPracticeSec, setAccumulatedPracticeSec] = useState(0);
  const [activeAssault, setActiveAssault] = useState<LudusAssaultDto | null>(
    null,
  );
  const [remainingSec, setRemainingSec] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const accumulatedRef = useRef(0);
  const practiceTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localRef = useRef({ visual, assaultNotes });
  const paramsRef = useRef<SoundLabParams>(DEFAULT_SOUND_LAB_PARAMS);
  const tabVisibleRef = useRef(true);
  const assaultEndedRef = useRef(false);
  const assaultTitleRef = useRef("");
  const selectedBlockRef = useRef(25);
  const selectedMicrotaskIdRef = useRef<string | null>(null);

  const {
    isPlaying,
    params,
    pulseVisual,
    breathingState,
    play,
    stop,
    setMode,
    updateParams: engineUpdateParams,
  } = useSoundLabEngine(DEFAULT_SOUND_LAB_PARAMS);

  useEffect(() => {
    const sound = readSoundLabSession();
    const local = readTrincheraLocal();
    accumulatedRef.current = sound.accumulatedPracticeSec;
    setAccumulatedPracticeSec(sound.accumulatedPracticeSec);
    paramsRef.current = {
      mode: sound.mode,
      volumeDb: sound.volumeDb,
      pulseHz: sound.pulseHz,
      isochronicCarrierHz: sound.isochronicCarrierHz,
      carrierHz: sound.carrierHz,
      beatHz: sound.beatHz,
      meditativeBaseHz: sound.meditativeBaseHz,
      breathingSecPerPhase: sound.breathingSecPerPhase,
    };
    engineUpdateParams(paramsRef.current);
    setVisualState(local.visual);
    setAssaultNotesState(local.assaultNotes);
    localRef.current = { visual: local.visual, assaultNotes: local.assaultNotes };
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSound = useCallback(() => {
    persistSoundLabParams(paramsRef.current, accumulatedRef.current);
  }, []);

  const persistLocal = useCallback(() => {
    writeTrincheraLocal({
      visual: localRef.current.visual,
      assaultNotes: localRef.current.assaultNotes,
    });
  }, []);

  const setVisual = useCallback(
    (next: TrincheraVisualPrefs) => {
      localRef.current = { ...localRef.current, visual: next };
      setVisualState(next);
      persistLocal();
    },
    [persistLocal],
  );

  const setAssaultNotes = useCallback(
    (notes: string) => {
      localRef.current = { ...localRef.current, assaultNotes: notes };
      setAssaultNotesState(notes);
      persistLocal();
    },
    [persistLocal],
  );

  const setAssaultTitle = useCallback((title: string) => {
    assaultTitleRef.current = title;
    setAssaultTitleState(title);
  }, []);

  const setSelectedBlock = useCallback((minutes: number) => {
    selectedBlockRef.current = minutes;
    setSelectedBlockState(minutes);
  }, []);

  const setSelectedMicrotaskId = useCallback((id: string | null) => {
    selectedMicrotaskIdRef.current = id;
    setSelectedMicrotaskIdState(id);
  }, []);

  const updateParams = useCallback(
    (patch: Partial<SoundLabParams>) => {
      paramsRef.current = { ...paramsRef.current, ...patch };
      engineUpdateParams(patch);
      persistSound();
    },
    [engineUpdateParams, persistSound],
  );

  const stopPracticeTick = useCallback(() => {
    if (practiceTickRef.current) {
      clearInterval(practiceTickRef.current);
      practiceTickRef.current = null;
    }
  }, []);

  const finishSession = useCallback(
    async (completed: boolean) => {
      if (!activeAssault || isCompleting) return;
      setIsCompleting(true);
      stop();

      try {
        const response = await fetch("/api/ludus/trinchera", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            assaultId: activeAssault.id,
            tabSurvived: tabVisibleRef.current,
            completed,
          }),
        });
        const data = (await response.json()) as CompleteAssaultResult & {
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Error al cerrar asalto.");

        if (data.signalPointsEarned > 0) {
          toast.success(
            `+${data.signalPointsEarned} Puntos de Señal (racha ×${data.streakBonus.toFixed(1)})`,
          );
        } else if (!tabVisibleRef.current) {
          toast.warning("Perdiste la pestaña — sin Puntos de Señal.");
        }

        setActiveAssault(null);
        onRefresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al cerrar asalto.",
        );
      } finally {
        setIsCompleting(false);
      }
    },
    [activeAssault, isCompleting, onRefresh, stop],
  );

  const startSession = useCallback(
    async (snapshot: TrincheraSnapshot) => {
      const title =
        assaultTitleRef.current.trim() ||
        snapshot.pendingMicrotasks.find(
          (task) => task.id === selectedMicrotaskIdRef.current,
        )?.title ||
        "";

      if (!title || isStarting || activeAssault) return;
      setIsStarting(true);

      try {
        const response = await fetch("/api/ludus/trinchera", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            durationMin: selectedBlockRef.current,
            microtaskId: selectedMicrotaskIdRef.current ?? undefined,
          }),
        });
        const data = (await response.json()) as {
          assault: LudusAssaultDto;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Error al iniciar.");

        setActiveAssault(data.assault);
        tabVisibleRef.current = document.visibilityState === "visible";
        setTabVisible(tabVisibleRef.current);
        await play();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo iniciar la sesión.",
        );
      } finally {
        setIsStarting(false);
      }
    },
    [activeAssault, isStarting, play],
  );

  useEffect(() => {
    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      setTabVisible(visible);
      tabVisibleRef.current = visible;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!activeAssault) return;

    assaultEndedRef.current = false;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [activeAssault]);

  useEffect(() => {
    if (!activeAssault) return;

    const endsAt = new Date(activeAssault.endsAt).getTime();

    const tick = () => {
      const diff = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSec(diff);

      if (diff <= 0 && !assaultEndedRef.current) {
        assaultEndedRef.current = true;
        void finishSession(true);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeAssault, finishSession]);

  useEffect(() => {
    if (!hydrated || !isPlaying) {
      stopPracticeTick();
      return;
    }

    practiceTickRef.current = setInterval(() => {
      const next = accumulatedRef.current + 1;
      accumulatedRef.current = next;
      setAccumulatedPracticeSec(next);
      persistSoundLabParams(paramsRef.current, next);
    }, 1000);

    return stopPracticeTick;
  }, [hydrated, isPlaying, stopPracticeTick]);

  useEffect(() => {
    return () => {
      stopPracticeTick();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: TrincheraSessionContextValue = {
    hydrated,
    visual,
    setVisual,
    assaultNotes,
    setAssaultNotes,
    assaultTitle,
    setAssaultTitle,
    selectedBlock,
    setSelectedBlock,
    selectedMicrotaskId,
    setSelectedMicrotaskId,
    isPlaying,
    isSessionActive: !!activeAssault,
    isStarting,
    isCompleting,
    tabVisible,
    params,
    pulseVisual,
    breathingState,
    accumulatedPracticeSec,
    play,
    stop,
    setMode: (mode) => {
      paramsRef.current = { ...paramsRef.current, mode };
      setMode(mode);
      persistSound();
    },
    updateParams,
    activeAssault,
    remainingSec,
    startSession,
    finishSession,
  };

  return (
    <TrincheraSessionContext.Provider value={value}>
      {children}
    </TrincheraSessionContext.Provider>
  );
}
