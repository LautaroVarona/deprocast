import { z } from "zod";

import { HEALTH_PILLARS } from "@/lib/events/types";

export const EXPORT_DOMAIN_IDS = [
  "journal",
  "projects",
  "laboral",
  "audio",
  "kg",
  "chat",
  "health",
  "ingesta",
  "cuadernos",
  "enciclopedia",
  "ludus",
  "vibe",
  "cam-recorder",
  "molecular",
  "preferences",
  "historial",
] as const;

export const exportDomainIdSchema = z.enum(EXPORT_DOMAIN_IDS);
export type ExportDomainId = z.infer<typeof exportDomainIdSchema>;

export type DomainTableSpec = {
  table: string;
  /** SQL WHERE sin la palabra WHERE (null = tabla completa). */
  whereSql?: string;
  /** Menor = se borra antes en wipe (hijos primero). */
  deleteOrder: number;
};

export type ExportDomain = {
  id: ExportDomainId;
  label: string;
  description: string;
  group: string;
  tables: DomainTableSpec[];
  dataPaths: string[];
  excludeDataPaths?: string[];
  uploadPaths?: string[];
  clientOnly?: boolean;
};

const HEALTH_PILLAR_LIST = HEALTH_PILLARS.map((pillar) => `'${pillar}'`).join(", ");
const JOURNAL_EVENT_FILTER = `source IN ('journal', 'diario', 'manual')`;
const CHAT_EVENT_FILTER = `source = 'chat'`;
const HEALTH_EVENT_FILTER = `pillar IN (${HEALTH_PILLAR_LIST})`;
const PROJECT_EVENT_FILTER = `pillar = 'proyecto'`;

function journalEventLinksFilter(): string {
  return `eventId IN (SELECT id FROM ContextEvent WHERE ${JOURNAL_EVENT_FILTER})`;
}

function chatEventLinksFilter(): string {
  return `eventId IN (SELECT id FROM ContextEvent WHERE ${CHAT_EVENT_FILTER})`;
}

function healthEventLinksFilter(): string {
  return `eventId IN (SELECT id FROM ContextEvent WHERE ${HEALTH_EVENT_FILTER})`;
}

function projectEventLinksFilter(): string {
  return `eventId IN (SELECT id FROM ContextEvent WHERE ${PROJECT_EVENT_FILTER})`;
}

export const EXPORT_DOMAINS: ExportDomain[] = [
  {
    id: "journal",
    label: "Diario",
    description:
      "Entradas Markdown del diario y eventos de contexto asociados (fuentes journal, diario y manual).",
    group: "Escritura",
    dataPaths: ["data/journal"],
    tables: [
      { table: "ContextEventLink", whereSql: journalEventLinksFilter(), deleteOrder: 10 },
      { table: "ContextEvent", whereSql: JOURNAL_EVENT_FILTER, deleteOrder: 20 },
    ],
  },
  {
    id: "projects",
    label: "Proyectos",
    description:
      "Archivos de campos (.md, .campo.json), propuestas, incubador y eventos de hitos de proyecto.",
    group: "Escritura",
    dataPaths: ["data/projects"],
    excludeDataPaths: ["data/projects/laboral"],
    tables: [
      { table: "ContextEventLink", whereSql: projectEventLinksFilter(), deleteOrder: 10 },
      { table: "ContextEvent", whereSql: PROJECT_EVENT_FILTER, deleteOrder: 20 },
      { table: "ProjectIncubationSession", deleteOrder: 30 },
      { table: "ProjectProposal", deleteOrder: 40 },
    ],
  },
  {
    id: "laboral",
    label: "Laboral",
    description: "Retos pendientes en la bandeja laboral.",
    group: "Escritura",
    dataPaths: ["data/projects/laboral"],
    tables: [],
  },
  {
    id: "audio",
    label: "Audio y transcripciones",
    description:
      "Archivos de audio subidos, transcripciones STT y segmentación fractal legacy.",
    group: "Media",
    dataPaths: [],
    uploadPaths: ["uploads"],
    tables: [
      { table: "ParentChunkTag", deleteOrder: 10 },
      { table: "ParentChunkEntity", deleteOrder: 20 },
      { table: "ChildChunk", deleteOrder: 30 },
      { table: "ParentChunk", deleteOrder: 40 },
      { table: "Transcript", deleteOrder: 50 },
      { table: "AudioAsset", deleteOrder: 60 },
      { table: "Tag", deleteOrder: 70 },
      { table: "Entity", deleteOrder: 80 },
    ],
  },
  {
    id: "kg",
    label: "Grafo de conocimiento",
    description:
      "Nodos, aristas, menciones, fuentes ingeridas y personas (subgrafo del KG).",
    group: "Conocimiento",
    dataPaths: [],
    tables: [
      { table: "KgMention", deleteOrder: 10 },
      { table: "KgEdge", deleteOrder: 20 },
      { table: "KgSource", deleteOrder: 30 },
      { table: "KgNode", deleteOrder: 40 },
    ],
  },
  {
    id: "chat",
    label: "Chat Exocórtex",
    description: "Sesiones, mensajes, relaciones de contexto y eventos de chat.",
    group: "Conversación",
    dataPaths: [],
    tables: [
      { table: "ContextEventLink", whereSql: chatEventLinksFilter(), deleteOrder: 10 },
      { table: "ChatContextRelation", deleteOrder: 20 },
      { table: "ChatMessage", deleteOrder: 30 },
      { table: "ChatSession", deleteOrder: 40 },
      { table: "ContextEvent", whereSql: CHAT_EVENT_FILTER, deleteOrder: 50 },
    ],
  },
  {
    id: "health",
    label: "Salud",
    description:
      "Registros de telemetría de los 4 pilares y eventos de contexto de salud.",
    group: "Bienestar",
    dataPaths: [],
    tables: [
      { table: "ContextEventLink", whereSql: healthEventLinksFilter(), deleteOrder: 10 },
      { table: "HealthRecord", deleteOrder: 20 },
      { table: "ContextEvent", whereSql: HEALTH_EVENT_FILTER, deleteOrder: 30 },
    ],
  },
  {
    id: "ingesta",
    label: "Ingesta y documentos",
    description:
      "Pipeline de documentos (pending, purificación, completados), visión/tacho, purificador, meta-meteador y marcadores de X.",
    group: "Media",
    dataPaths: ["data/raw_documents", "data/tacho"],
    excludeDataPaths: ["data/tacho/notas"],
    tables: [
      { table: "XBookmark", deleteOrder: 10 },
      { table: "DocumentMeta", deleteOrder: 20 },
      { table: "PurifierReview", deleteOrder: 30 },
    ],
  },
  {
    id: "cuadernos",
    label: "Cuadernos",
    description: "Cuadernos escaneados, páginas e imágenes en tacho/notas.",
    group: "Media",
    dataPaths: ["data/tacho/notas"],
    tables: [
      { table: "NotebookPage", deleteOrder: 10 },
      { table: "Notebook", deleteOrder: 20 },
    ],
  },
  {
    id: "enciclopedia",
    label: "Enciclopedia",
    description: "Entradas generativas, árbol de exploración y reportes.",
    group: "Conocimiento",
    dataPaths: [],
    tables: [
      { table: "EncyclopediaReport", deleteOrder: 10 },
      { table: "EncyclopediaEdge", deleteOrder: 20 },
      { table: "EncyclopediaEntry", deleteOrder: 30 },
    ],
  },
  {
    id: "ludus",
    label: "Ludus",
    description:
      "Castillo (grids y tarjetas), puntos de señal, microtareas, asaltos y registro de proyectos Ludus.",
    group: "Ludus",
    dataPaths: [],
    tables: [
      { table: "LudusAssaultSession", deleteOrder: 10 },
      { table: "LudusMicrotask", deleteOrder: 20 },
      { table: "LudusProjectRegistry", deleteOrder: 30 },
      { table: "CastleCard", deleteOrder: 40 },
      { table: "CastleGrid", deleteOrder: 50 },
      { table: "LudusState", deleteOrder: 60 },
    ],
  },
  {
    id: "vibe",
    label: "Vibe Calibrator",
    description: "Sesiones y votos de calibración de vibe 1–12.",
    group: "Herramientas",
    dataPaths: [],
    tables: [
      { table: "VibeCalibrationVote", deleteOrder: 10 },
      { table: "VibeCalibrationSession", deleteOrder: 20 },
    ],
  },
  {
    id: "cam-recorder",
    label: "Cam Recorder",
    description: "Sesiones e inyecciones del watcher de cámara.",
    group: "Herramientas",
    dataPaths: ["data/cam-recorder-watcher"],
    tables: [],
  },
  {
    id: "molecular",
    label: "Molecular / Jornada",
    description: "Partículas validadas de la jornada molecular.",
    group: "Herramientas",
    dataPaths: ["data/molecular"],
    tables: [],
  },
  {
    id: "preferences",
    label: "Preferencias del navegador",
    description:
      "Tema, Ludus Trinchera, umbrales de X bookmarks y otras preferencias de UI guardadas en localStorage.",
    group: "Preferencias",
    dataPaths: [],
    clientOnly: true,
    tables: [],
  },
  {
    id: "historial",
    label: "Historial de actividad",
    description: "Log unificado de pipelines, agentes y validaciones HITL.",
    group: "Herramientas",
    dataPaths: [],
    tables: [{ table: "ActivityLog", deleteOrder: 15 }],
  },
];

const DOMAIN_BY_ID = new Map(EXPORT_DOMAINS.map((domain) => [domain.id, domain]));

export function getExportDomain(id: ExportDomainId): ExportDomain {
  const domain = DOMAIN_BY_ID.get(id);
  if (!domain) {
    throw new Error(`Dominio de exportación desconocido: ${id}`);
  }

  return domain;
}

export function getAllExportDomains(): ExportDomain[] {
  return EXPORT_DOMAINS;
}

export function parseExportDomainIds(raw: unknown): ExportDomainId[] {
  const parsed = z.array(exportDomainIdSchema).min(1).parse(raw);
  return [...new Set(parsed)];
}

export type MergedTableSpec = {
  table: string;
  whereSql?: string;
  deleteOrder: number;
};

export function mergeTableSpecsForDomains(
  domainIds: ExportDomainId[],
): MergedTableSpec[] {
  const byTable = new Map<string, MergedTableSpec>();

  for (const domainId of domainIds) {
    const domain = getExportDomain(domainId);
    for (const spec of domain.tables) {
      const existing = byTable.get(spec.table);
      if (!existing) {
        byTable.set(spec.table, { ...spec });
        continue;
      }

      if (!existing.whereSql || !spec.whereSql) {
        byTable.set(spec.table, {
          table: spec.table,
          whereSql: undefined,
          deleteOrder: Math.min(existing.deleteOrder, spec.deleteOrder),
        });
        continue;
      }

      if (existing.whereSql !== spec.whereSql) {
        byTable.set(spec.table, {
          table: spec.table,
          whereSql: `(${existing.whereSql}) OR (${spec.whereSql})`,
          deleteOrder: Math.min(existing.deleteOrder, spec.deleteOrder),
        });
      }
    }
  }

  return [...byTable.values()].sort((a, b) => a.deleteOrder - b.deleteOrder);
}

export function sortTablesForInsert(specs: MergedTableSpec[]): MergedTableSpec[] {
  return [...specs].sort((a, b) => b.deleteOrder - a.deleteOrder);
}

export function sortTablesForDelete(specs: MergedTableSpec[]): MergedTableSpec[] {
  return [...specs].sort((a, b) => a.deleteOrder - b.deleteOrder);
}

export function fileBelongsToDomain(
  relativePath: string,
  domain: ExportDomain,
): boolean {
  const normalized = relativePath.replace(/\\/g, "/");

  const matchesData = (domain.dataPaths ?? []).some((prefix) => {
    const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return normalized === prefix || normalized.startsWith(withSlash);
  });

  const matchesUpload = (domain.uploadPaths ?? []).some((prefix) => {
    const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return normalized === prefix || normalized.startsWith(withSlash);
  });

  if (!matchesData && !matchesUpload) {
    return false;
  }

  for (const exclude of domain.excludeDataPaths ?? []) {
    const withSlash = exclude.endsWith("/") ? exclude : `${exclude}/`;
    if (normalized === exclude || normalized.startsWith(withSlash)) {
      return false;
    }
  }

  return true;
}

export function filterFilesForDomains(
  files: { relativePath: string; absolutePath: string; sizeBytes: number }[],
  domainIds: ExportDomainId[],
): typeof files {
  const domains = domainIds.map((id) => getExportDomain(id));
  return files.filter((file) =>
    domains.some((domain) => fileBelongsToDomain(file.relativePath, domain)),
  );
}

export function getDomainGroups(): { group: string; domains: ExportDomain[] }[] {
  const groups = new Map<string, ExportDomain[]>();

  for (const domain of EXPORT_DOMAINS) {
    const list = groups.get(domain.group) ?? [];
    list.push(domain);
    groups.set(domain.group, list);
  }

  return [...groups.entries()].map(([group, domains]) => ({ group, domains }));
}

export const BACKUP_BROWSER_PREFERENCES_FILENAME = "browser-preferences.json";

export const EXPORT_META_TABLE = "_deprocast_export_meta";

/** Claves de localStorage que el cliente puede incluir en exportación de preferencias. */
export const BROWSER_PREFERENCE_KEYS = [
  "deprocast:trinchera:local",
  "deprocast:trinchera:sound-lab",
  "deprocast:trinchera:isochronic",
  "deprocast-proposals-density-level",
  "deprocast:x-bookmark-calibrator",
  "deprocast:x-bookmark-threshold",
  "deprocast-theme",
] as const;

export type DomainPreviewStat = {
  id: ExportDomainId;
  label: string;
  description: string;
  group: string;
  clientOnly: boolean;
  fileCount: number;
  totalBytes: number;
  rowCount: number;
};
