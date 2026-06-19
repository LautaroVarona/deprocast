"use client";

import {
  DEFAULT_CALIBRATION_WEIGHT,
  DEFAULT_QUEUE_CONFIG,
} from "@/lib/vibe-calibrator/constants";
import type {
  CalibratorQueueConfig,
  CalibratorSessionStatus,
  VibeCalibrationCard,
  VibeCalibrationVotePayload,
} from "./types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

type CalibratorState = {
  config: CalibratorQueueConfig;
  sessionId: string | null;
  cards: VibeCalibrationCard[];
  currentIndex: number;
  votes: VibeCalibrationVotePayload[];
  isHistoryOpen: boolean;
  status: CalibratorSessionStatus;
  isModalOpen: boolean;
  isTransitioning: boolean;
};

type CalibratorAction =
  | { type: "SET_CONFIG"; payload: Partial<CalibratorQueueConfig> }
  | {
      type: "START_SESSION";
      payload: { sessionId: string; cards: VibeCalibrationCard[] };
    }
  | { type: "COMMIT_VOTE"; payload: VibeCalibrationVotePayload }
  | { type: "ADVANCE" }
  | { type: "TOGGLE_HISTORY" }
  | { type: "SET_HISTORY_OPEN"; payload: boolean }
  | { type: "SET_TRANSITIONING"; payload: boolean }
  | { type: "END_SESSION" };

const initialState: CalibratorState = {
  config: DEFAULT_QUEUE_CONFIG,
  sessionId: null,
  cards: [],
  currentIndex: 0,
  votes: [],
  isHistoryOpen: false,
  status: "idle",
  isModalOpen: false,
  isTransitioning: false,
};

function calibratorReducer(
  state: CalibratorState,
  action: CalibratorAction,
): CalibratorState {
  switch (action.type) {
    case "SET_CONFIG":
      return {
        ...state,
        config: { ...state.config, ...action.payload },
      };
    case "START_SESSION":
      return {
        ...state,
        sessionId: action.payload.sessionId,
        cards: action.payload.cards,
        currentIndex: 0,
        votes: [],
        isHistoryOpen: false,
        status: "active",
        isModalOpen: true,
        isTransitioning: false,
      };
    case "COMMIT_VOTE":
      return {
        ...state,
        votes: [...state.votes, action.payload],
        isHistoryOpen: false,
      };
    case "ADVANCE": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.cards.length) {
        return {
          ...state,
          currentIndex: nextIndex,
          status: "completed",
          isTransitioning: false,
        };
      }
      return {
        ...state,
        currentIndex: nextIndex,
        isTransitioning: false,
      };
    }
    case "TOGGLE_HISTORY":
      return { ...state, isHistoryOpen: !state.isHistoryOpen };
    case "SET_HISTORY_OPEN":
      return { ...state, isHistoryOpen: action.payload };
    case "SET_TRANSITIONING":
      return { ...state, isTransitioning: action.payload };
    case "END_SESSION":
      return {
        ...initialState,
        config: state.config,
      };
    default:
      return state;
  }
}

type CalibratorContextValue = {
  state: CalibratorState;
  dispatch: Dispatch<CalibratorAction>;
  currentCard: VibeCalibrationCard | null;
  defaultWeight: number;
  startSession: () => Promise<void>;
  commitVote: (weight: number) => Promise<void>;
  endSession: () => Promise<void>;
};

const CalibratorContext = createContext<CalibratorContextValue | null>(null);

export function CalibratorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(calibratorReducer, initialState);

  const currentCard =
    state.status === "active" && state.currentIndex < state.cards.length
      ? state.cards[state.currentIndex] ?? null
      : null;

  const startSession = useCallback(async () => {
    const response = await fetch("/api/vibe-calibrator/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: state.config }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "No se pudo iniciar la sesión.",
      );
    }

    dispatch({
      type: "START_SESSION",
      payload: {
        sessionId: data.sessionId as string,
        cards: data.cards as VibeCalibrationCard[],
      },
    });
  }, [state.config]);

  const commitVote = useCallback(
    async (weight: number) => {
      if (!currentCard || !state.sessionId || state.isTransitioning) return;

      const vote: VibeCalibrationVotePayload = {
        cardId: currentCard.id,
        weight,
        timestamp: new Date(),
        metadata: currentCard.metadata,
        title: currentCard.title,
      };

      dispatch({ type: "SET_TRANSITIONING", payload: true });
      dispatch({ type: "COMMIT_VOTE", payload: vote });

      void fetch("/api/vibe-calibrator/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          cardId: currentCard.id,
          weight,
          cardSource: currentCard.source,
          sourceRef: currentCard.sourceRef,
          title: currentCard.title,
          metadata: currentCard.metadata,
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const { toast } = await import("sonner");
          toast.error(
            typeof data.error === "string"
              ? data.error
              : "No se pudo guardar el voto.",
          );
        }
      });

      window.setTimeout(() => {
        dispatch({ type: "ADVANCE" });
      }, 300);
    },
    [currentCard, state.sessionId, state.isTransitioning],
  );

  const endSession = useCallback(async () => {
    if (state.sessionId) {
      await fetch("/api/vibe-calibrator/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          action: "complete",
        }),
      }).catch(() => undefined);
    }
    dispatch({ type: "END_SESSION" });
  }, [state.sessionId]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      currentCard,
      defaultWeight: DEFAULT_CALIBRATION_WEIGHT,
      startSession,
      commitVote,
      endSession,
    }),
    [state, currentCard, startSession, commitVote, endSession],
  );

  return (
    <CalibratorContext.Provider value={value}>
      {children}
    </CalibratorContext.Provider>
  );
}

export function useCalibrator() {
  const context = useContext(CalibratorContext);
  if (!context) {
    throw new Error("useCalibrator debe usarse dentro de CalibratorProvider.");
  }
  return context;
}
