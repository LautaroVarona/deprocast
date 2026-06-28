export const CAM_RECORDER_STORAGE_DIR = "cam-recorder-watcher";
export const CAM_RECORDER_SESSIONS_FILE = "sessions.json";
export const CAM_RECORDER_LATEST_INJECTION_FILE = "latest-injection.json";

export const VIDEO_ACCEPTED_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".mkv",
] as const;

export const VIDEO_ACCEPT_MIME = [
  "video/mp4",
  "video/x-m4v",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
] as const;

export const WATCHER_SIM_DELAY_MS = {
  noteInterval: 380,
  minAnalyze: 800,
  inject: 500,
} as const;

/** Plantillas mock para simular análisis de screen recordings de desarrollo. */
export const MOCK_CONSCIOUSNESS_SCENARIOS: {
  appActiva: string;
  descripcionDetallada: string;
  nivelDeFoco: number;
  /** Peso relativo para distribuir notas a lo largo del video. */
  weight: number;
}[] = [
  {
    appActiva: "Cursor",
    descripcionDetallada:
      "El usuario abrió VS Code / Cursor y comenzó a refactorizar el hook useTicker — extrajo lógica de intervalo a un módulo dedicado en hooks/use-event-ticker.ts.",
    nivelDeFoco: 11,
    weight: 3,
  },
  {
    appActiva: "Terminal",
    descripcionDetallada:
      "Ejecutó `npm run dev` en la raíz del monorepo; el servidor Next.js arrancó en :3000 sin errores de compilación.",
    nivelDeFoco: 9,
    weight: 2,
  },
  {
    appActiva: "Browser",
    descripcionDetallada:
      "Navegó a localhost:3000/molecular — inspeccionó el panel del Calibrador Central y comparó propuestas de eje X/Y/Z en las tarjetas de partículas.",
    nivelDeFoco: 8,
    weight: 2,
  },
  {
    appActiva: "Cursor",
    descripcionDetallada:
      "Editó components/jornada/event-ticker.tsx: añadió animación de marquee y estados idle/active con clases jornada-noir en globals.css.",
    nivelDeFoco: 12,
    weight: 3,
  },
  {
    appActiva: "Browser",
    descripcionDetallada:
      "Consultó documentación de Next.js App Router en node_modules/next/dist/docs/ — pestaña sobre maxDuration y runtime nodejs para API routes.",
    nivelDeFoco: 7,
    weight: 1,
  },
  {
    appActiva: "Slack",
    descripcionDetallada:
      "Revisó un hilo del equipo sobre priorización de la Variable X; respondió con un fragmento del backlog de Jornada.",
    nivelDeFoco: 4,
    weight: 1,
  },
  {
    appActiva: "Cursor",
    descripcionDetallada:
      "Implementó validación Zod en app/api/molecular/chunk/route.ts y tipó el payload de respuesta con ParticulaMetadata[].",
    nivelDeFoco: 11,
    weight: 2,
  },
  {
    appActiva: "Terminal",
    descripcionDetallada:
      "Corrió `git status` y revisó archivos sin trackear del módulo molecular; no hizo commit.",
    nivelDeFoco: 6,
    weight: 1,
  },
  {
    appActiva: "Browser",
    descripcionDetallada:
      "Abrió la pestaña /jornada — observó la barra de energía y el ticker de eventos programados con datos mock.",
    nivelDeFoco: 8,
    weight: 2,
  },
  {
    appActiva: "Spotify",
    descripcionDetallada:
      "Pausó la música y volvió al IDE — micro-interrupción de ~40s sin interacción productiva en pantalla.",
    nivelDeFoco: 2,
    weight: 1,
  },
  {
    appActiva: "Cursor",
    descripcionDetallada:
      "Depuró un error de hidratación en MolecularProvider: ajustó useEffect para no disparar calibrador antes de fase disintegrating.",
    nivelDeFoco: 10,
    weight: 2,
  },
  {
    appActiva: "Browser",
    descripcionDetallada:
      "Validó en /calibrador el flujo HITL de tarjetas flip — votó peso 9 en una partícula de bloque Tech.",
    nivelDeFoco: 9,
    weight: 2,
  },
];
