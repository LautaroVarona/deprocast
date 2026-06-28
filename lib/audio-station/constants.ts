import type { PostprocessStage, PreprocessTool } from "@/lib/audio-station/types";

export const PREPROCESS_TOOLS: PreprocessTool[] = [
  {
    id: "deduplicate",
    label: "Desduplicar",
    description:
      "Detecta copias por nombre normalizado, sufijos (1)/(2) y colisiones numéricas.",
    status: "available",
    focus: "pre",
  },
  {
    id: "voice-isolation",
    label: "Aislamiento de voz (ENR)",
    description:
      "Reduce ruido ambiental y deja la voz principal. Próximo paso del pre-procesamiento.",
    status: "planned",
    focus: "pre",
  },
  {
    id: "silence-trim",
    label: "Recorte de silencios",
    description:
      "Elimina pausas largas al inicio, medio y final para acortar el STT.",
    status: "planned",
    focus: "pre",
  },
  {
    id: "level-normalize",
    label: "Normalizar niveles",
    description: "Estandariza volumen antes de enviar a Chirp_2.",
    status: "planned",
    focus: "pre",
  },
];

export const POSTPROCESS_PIPELINE: PostprocessStage[] = [
  {
    id: "stt",
    label: "STT · Chirp_2",
    description:
      "Transcripción cruda, timestamps y texto parcial ante fallos.",
    route: "/audio",
    agentId: "stt",
  },
  {
    id: "purifier",
    label: "Purificación",
    description:
      "Limpieza semántica, esencias, normalización y revisión HITL.",
    route: "/validar",
    agentId: "orquestador",
  },
  {
    id: "segmentation",
    label: "Segmentación fractal",
    description: "Bloques padre/hijo para búsqueda y re-indexado.",
    agentId: "orquestador",
  },
  {
    id: "classification",
    label: "Clasificación · Meta-Meteador",
    description: "Matriz cuántica, áreas de relevancia y títulos atómicos.",
    route: "/agentes",
    agentId: "meta-meteador",
  },
  {
    id: "organization",
    label: "Organización · Molecular",
    description: "Chunkeo semántico, calibración de ejes y validación.",
    route: "/molecular",
  },
  {
    id: "graph",
    label: "Grafo de conocimiento",
    description: "Entidades, relaciones y menciones persistidas en SQLite.",
    route: "/grafo",
    agentId: "motor-kg",
  },
];
