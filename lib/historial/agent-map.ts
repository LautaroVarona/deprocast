/** Mapeo estación Purifier → agentId del catálogo. */
export const PURIFIER_STATION_AGENTS: Record<number, { agentId: string; agentName: string }> = {
  1: { agentId: "regex", agentName: "Limpieza Regex" },
  2: { agentId: "editor-semantico", agentName: "Editor Semántico STT" },
  3: { agentId: "jaccard", agentName: "Deduplicación Jaccard" },
  4: { agentId: "extractor-esencias", agentName: "Extractor de Esencias" },
  5: { agentId: "archivista", agentName: "Archivista Deprocast" },
  6: { agentId: "fractal", agentName: "Segmentación Fractal" },
};

export const PURIFIER_KG_AGENT = {
  agentId: "motor-kg",
  agentName: "Motor de Extracción KG",
};

export const ORCHESTRATOR_AGENT = {
  agentId: "orquestador",
  agentName: "Orquestador Purifier",
};

export function getAgentForPurifierStation(station: number): {
  agentId: string;
  agentName: string;
} {
  return (
    PURIFIER_STATION_AGENTS[station] ?? {
      agentId: ORCHESTRATOR_AGENT.agentId,
      agentName: ORCHESTRATOR_AGENT.agentName,
    }
  );
}

/** Nombres legibles para agentIds del catálogo (fallback). */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  exocortex: "Exocórtex Interactivo",
  stt: "Motor de Transcripción STT",
  vision: "Agente de Visión OCR",
  "editor-semantico": "Editor Semántico STT",
  "extractor-esencias": "Extractor de Esencias",
  "motor-kg": "Motor de Extracción KG",
  archivista: "Archivista Deprocast",
  orquestador: "Orquestador Purifier",
  "babel-universes": "Universos de Babel",
  calibrador: "Calibrador de Vibe",
  listador: "El Listador",
  "task-calibrator": "Calibrador de Tareas",
  enciclopediador: "Enciclopediador",
  "cam-recorder-watcher": "Cam-Recorder-Watcher",
  "meta-meteador": "Meta-Meteador",
  binauralizer: "Binauralizer",
  ludus: "LudusDirector",
  "extractor-trailing": "Extractor de Comandos Trailing",
  "extractor-eventos": "Extractor de Eventos Contextuales",
  "vision-atomica": "Agente de Visión Atómica",
  "chunkeador-semantico": "Chunkeador Semántico",
  "calibrador-central": "Calibrador Central",
  "incubador-atanor": "Incubador del Atanor",
  mnemosyne: "Mnemosyne",
  regex: "Limpieza Regex",
  jaccard: "Deduplicación Jaccard",
  fractal: "Segmentación Fractal",
  "centinela-somatico": "Centinela Somático",
  nutrimetron: "Nutrimetron",
  kinetometro: "Kinetómetro",
  somatometron: "Somatometrón",
  ambientografo: "Ambientógrafo",
  cronista: "Cronista",
};

export function resolveAgentName(agentId: string | undefined | null): string | null {
  if (!agentId) return null;
  return AGENT_DISPLAY_NAMES[agentId] ?? agentId;
}
