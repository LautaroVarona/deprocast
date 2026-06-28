"use client";

import { useEventTicker } from "@/hooks/use-event-ticker";
import {
  MOCK_JORNADA_TASKS,
  MOCK_SCHEDULED_EVENTS,
  MATE_BREAK_MS,
  GOLDEN_TASK_COUNT,
} from "@/lib/jornada/constants";
import type {
  BloquePrioridad,
  JournalLog,
  JornadaState,
  JornadaTask,
  ScheduledEvent,
  TickerSnapshot,
} from "@/lib/jornada/types";
import {
  computeTaskCurrency,
  selectGoldenTasks,
} from "@/lib/jornada/utils";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

type JornadaAction =
  | { type: "TOUCH" }
  | { type: "START_MATE_BREAK" }
  | { type: "CLOSE_ACTIVE_BLOCK"; payload: { eventId: string } }
  | { type: "COMPLETE_TASK"; payload: { taskId: string } }
  | { type: "APPEND_LOG"; payload: JournalLog }
  | { type: "SET_EVENTS"; payload: ScheduledEvent[] }
  | { type: "SET_TASKS"; payload: JornadaTask[] };

function createLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function appendLog(
  logs: JournalLog[],
  kind: JournalLog["kind"],
  message: string,
): JournalLog[] {
  return [
    {
      id: createLogId(),
      kind,
      message,
      timestamp: Date.now(),
    },
    ...logs,
  ].slice(0, 80);
}

const initialState: JornadaState = {
  events: MOCK_SCHEDULED_EVENTS,
  tasks: MOCK_JORNADA_TASKS,
  logs: [
    {
      id: "log-boot",
      kind: "sistema",
      message: "[Boot] Tiempo-Espacio y Partícula sincronizados.",
      timestamp: Date.now(),
    },
  ],
  currency: 0,
  goldenCompletionsToday: 0,
  mateBreakUntil: null,
  closedEventIds: [],
  lastInteractionAt: Date.now(),
};

function jornadaReducer(state: JornadaState, action: JornadaAction): JornadaState {
  switch (action.type) {
    case "TOUCH":
      return { ...state, lastInteractionAt: Date.now() };

    case "START_MATE_BREAK": {
      const until = Date.now() + MATE_BREAK_MS;
      return {
        ...state,
        mateBreakUntil: until,
        lastInteractionAt: Date.now(),
        logs: appendLog(
          state.logs,
          "tiempo",
          "[Log - Tiempo]: Mate de 5 min iniciado. Ritmo desacoplado.",
        ),
      };
    }

    case "CLOSE_ACTIVE_BLOCK": {
      const { eventId } = action.payload;
      if (state.closedEventIds.includes(eventId)) return state;

      const event = state.events.find((item) => item.id === eventId);
      return {
        ...state,
        closedEventIds: [...state.closedEventIds, eventId],
        lastInteractionAt: Date.now(),
        logs: appendLog(
          state.logs,
          "tiempo",
          `[Log - Tiempo]: Bloque "${event?.titulo ?? eventId}" cerrado manualmente.`,
        ),
      };
    }

    case "COMPLETE_TASK": {
      const task = state.tasks.find((item) => item.id === action.payload.taskId);
      if (!task || task.completada) return state;

      const wasGolden = selectGoldenTasks(state.tasks).some(
        (golden) => golden.id === task.id,
      );
      const reward = computeTaskCurrency(task.ejeY, task.ejeZ);
      const updatedTasks = state.tasks.map((item) =>
        item.id === task.id ? { ...item, completada: true } : item,
      );

      return {
        ...state,
        tasks: updatedTasks,
        currency: Number((state.currency + reward).toFixed(2)),
        goldenCompletionsToday: wasGolden
          ? Math.min(GOLDEN_TASK_COUNT, state.goldenCompletionsToday + 1)
          : state.goldenCompletionsToday,
        lastInteractionAt: Date.now(),
        logs: appendLog(
          state.logs,
          "accion",
          `[Log - Acción]: Tarea [${task.nombre}] completada con éxito.`,
        ),
      };
    }

    case "APPEND_LOG":
      return {
        ...state,
        logs: [action.payload, ...state.logs].slice(0, 80),
      };

    case "SET_EVENTS":
      return { ...state, events: action.payload };

    case "SET_TASKS":
      return { ...state, tasks: action.payload };

    default:
      return state;
  }
}

type JornadaContextValue = {
  state: JornadaState;
  dispatch: Dispatch<JornadaAction>;
  goldenTasks: JornadaTask[];
  ticker: TickerSnapshot;
  activeBloque: BloquePrioridad | null;
  energyProgress: number;
  touch: () => void;
  startMateBreak: () => void;
  closeActiveBlock: (eventId: string) => void;
  completeTask: (taskId: string) => void;
};

const JornadaContext = createContext<JornadaContextValue | null>(null);

export function JornadaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(jornadaReducer, initialState);

  const touch = useCallback(() => dispatch({ type: "TOUCH" }), []);
  const startMateBreak = useCallback(() => dispatch({ type: "START_MATE_BREAK" }), []);
  const closeActiveBlock = useCallback(
    (eventId: string) => dispatch({ type: "CLOSE_ACTIVE_BLOCK", payload: { eventId } }),
    [],
  );
  const completeTask = useCallback(
    (taskId: string) => dispatch({ type: "COMPLETE_TASK", payload: { taskId } }),
    [],
  );

  const ticker = useEventTicker({
    events: state.events,
    closedEventIds: state.closedEventIds,
    mateBreakUntil: state.mateBreakUntil,
    lastInteractionAt: state.lastInteractionAt,
  });

  const activeBloque = ticker.activeEvent?.bloquePrioridad ?? null;

  const goldenTasks = useMemo(
    () => selectGoldenTasks(state.tasks),
    [state.tasks],
  );

  const energyProgress = useMemo(
    () =>
      Math.round(
        (Math.min(state.goldenCompletionsToday, GOLDEN_TASK_COUNT) /
          GOLDEN_TASK_COUNT) *
          100,
      ),
    [state.goldenCompletionsToday],
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      goldenTasks,
      ticker,
      activeBloque,
      energyProgress,
      touch,
      startMateBreak,
      closeActiveBlock,
      completeTask,
    }),
    [
      state,
      goldenTasks,
      ticker,
      activeBloque,
      energyProgress,
      touch,
      startMateBreak,
      closeActiveBlock,
      completeTask,
    ],
  );

  return (
    <JornadaContext.Provider value={value}>{children}</JornadaContext.Provider>
  );
}

export function useJornada() {
  const context = useContext(JornadaContext);
  if (!context) {
    throw new Error("useJornada debe usarse dentro de JornadaProvider");
  }
  return context;
}
