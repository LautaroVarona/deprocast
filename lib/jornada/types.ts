export const BLOQUE_PRIORIDADES = [
  "Meta",
  "Salud",
  "Educación",
  "Finanzas",
  "Leyes",
  "Tech",
] as const;

export type BloquePrioridad = (typeof BLOQUE_PRIORIDADES)[number];

export type ScheduledEvent = {
  id: string;
  titulo: string;
  bloquePrioridad: BloquePrioridad;
  horaInicio: string;
  horaFin: string;
};

export type JornadaTask = {
  id: string;
  nombre: string;
  ejeX: BloquePrioridad;
  ejeY: number;
  ejeZ: number;
  completada: boolean;
};

export type JournalLogKind = "sistema" | "accion" | "tiempo";

export type JournalLog = {
  id: string;
  kind: JournalLogKind;
  message: string;
  timestamp: number;
};

export type TickerStatus =
  | "ejecutando"
  | "inactivo"
  | "desvio"
  | "mate"
  | "bloque_cerrado"
  | "esperando";

export type TickerSnapshot = {
  status: TickerStatus;
  activeEvent: ScheduledEvent | null;
  consoleLine: string;
  showQuickActions: boolean;
  progressInBlock: number;
  nextEvent: ScheduledEvent | null;
  now: Date;
};

export type JornadaState = {
  events: ScheduledEvent[];
  tasks: JornadaTask[];
  logs: JournalLog[];
  currency: number;
  goldenCompletionsToday: number;
  mateBreakUntil: number | null;
  closedEventIds: string[];
  lastInteractionAt: number;
};
