import type { BloquePrioridad, JornadaTask, ScheduledEvent } from "./types";

export const BLOQUE_PRIORITY_INDEX: Record<BloquePrioridad, number> = {
  Meta: 0,
  Salud: 1,
  Educación: 2,
  Finanzas: 3,
  Leyes: 4,
  Tech: 5,
};

export const BLOQUE_CONSOLE_HINTS: Record<BloquePrioridad, string> = {
  Meta: "Alineación estratégica activa. Horizonte sincronizado.",
  Salud: "Protocolo somático en curso. Ritmo estabilizado.",
  Educación: "Absorción cognitiva. Memoria de trabajo optimizada.",
  Finanzas: "Ledger interno auditado. Flujo de capital vigilado.",
  Leyes: "Marco normativo escaneado. Cumplimiento verificado.",
  Tech: "Consumo de energía optimizado. Stack en caliente.",
};

export const BLOQUE_COLORS: Record<BloquePrioridad, string> = {
  Meta: "text-amber-300",
  Salud: "text-emerald-300",
  Educación: "text-sky-300",
  Finanzas: "text-yellow-200",
  Leyes: "text-violet-300",
  Tech: "text-cyan-300",
};

export const BLOQUE_GLOW: Record<BloquePrioridad, string> = {
  Meta: "shadow-amber-500/30",
  Salud: "shadow-emerald-500/30",
  Educación: "shadow-sky-500/30",
  Finanzas: "shadow-yellow-400/30",
  Leyes: "shadow-violet-500/30",
  Tech: "shadow-cyan-500/30",
};

export const MOCK_SCHEDULED_EVENTS: ScheduledEvent[] = [
  {
    id: "evt-1",
    titulo: "Revisión de horizonte estratégico",
    bloquePrioridad: "Meta",
    horaInicio: "07:00",
    horaFin: "08:00",
  },
  {
    id: "evt-2",
    titulo: "Bloque somático + combustible",
    bloquePrioridad: "Salud",
    horaInicio: "08:00",
    horaFin: "09:30",
  },
  {
    id: "evt-3",
    titulo: "Inmersión de estudio profundo",
    bloquePrioridad: "Educación",
    horaInicio: "09:30",
    horaFin: "11:30",
  },
  {
    id: "evt-4",
    titulo: "Auditoría de flujo y presupuesto",
    bloquePrioridad: "Finanzas",
    horaInicio: "11:30",
    horaFin: "12:30",
  },
  {
    id: "evt-5",
    titulo: "Revisión de contratos y compliance",
    bloquePrioridad: "Leyes",
    horaInicio: "14:00",
    horaFin: "15:00",
  },
  {
    id: "evt-6",
    titulo: "Sprint de ingeniería y despliegue",
    bloquePrioridad: "Tech",
    horaInicio: "15:00",
    horaFin: "18:00",
  },
  {
    id: "evt-7",
    titulo: "Cierre de día y bitácora",
    bloquePrioridad: "Meta",
    horaInicio: "18:00",
    horaFin: "19:00",
  },
];

export const MOCK_JORNADA_TASKS: JornadaTask[] = [
  {
    id: "task-1",
    nombre: "Definir OKR trimestral",
    ejeX: "Meta",
    ejeY: 11,
    ejeZ: 4,
    completada: false,
  },
  {
    id: "task-2",
    nombre: "Mapear visión 2026",
    ejeX: "Meta",
    ejeY: 9,
    ejeZ: 6,
    completada: false,
  },
  {
    id: "task-3",
    nombre: "Sesión de movilidad 20 min",
    ejeX: "Salud",
    ejeY: 8,
    ejeZ: 2,
    completada: false,
  },
  {
    id: "task-4",
    nombre: "Registrar métricas de sueño",
    ejeX: "Salud",
    ejeY: 6,
    ejeZ: 1,
    completada: false,
  },
  {
    id: "task-5",
    nombre: "Leer capítulo de arquitectura",
    ejeX: "Educación",
    ejeY: 10,
    ejeZ: 5,
    completada: false,
  },
  {
    id: "task-6",
    nombre: "Flashcards de vocabulario técnico",
    ejeX: "Educación",
    ejeY: 7,
    ejeZ: 2,
    completada: false,
  },
  {
    id: "task-7",
    nombre: "Conciliar extracto bancario",
    ejeX: "Finanzas",
    ejeY: 9,
    ejeZ: 3,
    completada: false,
  },
  {
    id: "task-8",
    nombre: "Revisar cláusula de confidencialidad",
    ejeX: "Leyes",
    ejeY: 8,
    ejeZ: 7,
    completada: false,
  },
  {
    id: "task-9",
    nombre: "Refactorizar módulo de ingesta",
    ejeX: "Tech",
    ejeY: 12,
    ejeZ: 8,
    completada: false,
  },
  {
    id: "task-10",
    nombre: "Escribir tests de integración",
    ejeX: "Tech",
    ejeY: 10,
    ejeZ: 6,
    completada: false,
  },
];

export const GOLDEN_TASK_COUNT = 3;
export const MATE_BREAK_MS = 5 * 60 * 1000;
export const INACTIVITY_THRESHOLD_MS = 3 * 60 * 1000;
export const TICKER_TICK_MS = 1000;
