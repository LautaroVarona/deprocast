export const ACTIVITY_CATEGORIES = [
  "ingesta",
  "audio",
  "purifier",
  "validation",
  "chat",
  "events",
  "salud",
  "kg",
  "molecular",
  "meta",
  "cuadernos",
  "ludus",
  "vibe",
  "journal",
  "backup",
  "encyclopedia",
  "watcher",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_ACTIONS = [
  "captured",
  "transcribed",
  "purified",
  "approved",
  "rejected",
  "extracted_tasks",
  "extracted_events",
  "journal_saved",
  "chat_turn",
  "meta_processed",
  "notebook_processed",
  "molecular_validated",
  "kg_ingested",
  "indexed",
  "vibe_calibrated",
  "health_recorded",
  "encyclopedia_generated",
  "backup_exported",
  "backup_imported",
  "watcher_analyzed",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export type ActivityEntry = {
  id: string;
  occurredAt: string;
  category: ActivityCategory;
  action: ActivityAction | string;
  title: string;
  summary: string | null;
  agentId: string | null;
  agentName: string | null;
  modelUsed: string | null;
  sourceType: string | null;
  sourceRef: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ActivityDayGroup = {
  dayKey: string;
  dayLabel: string;
  entries: ActivityEntry[];
};

export type ActivityListFilters = {
  day?: string;
  category?: ActivityCategory;
  agentId?: string;
  limit?: number;
  cursor?: string;
  universeSlug?: string;
};

export type ActivityListResult = {
  entries: ActivityEntry[];
  nextCursor: string | null;
  totalForDay: number | null;
};

export type LogActivityInput = {
  occurredAt?: Date | null;
  category: ActivityCategory;
  action: ActivityAction | string;
  title: string;
  summary?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  modelUsed?: string | null;
  sourceType?: string | null;
  sourceRef?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
};

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  ingesta: "Ingesta",
  audio: "Audio",
  purifier: "Purifier",
  validation: "Validación",
  chat: "Chat",
  events: "Eventos",
  salud: "Salud",
  kg: "Knowledge Graph",
  molecular: "Molecular",
  meta: "Meta-Meteador",
  cuadernos: "Cuadernos",
  ludus: "Ludus",
  vibe: "Calibrador Vibe",
  journal: "Diario",
  backup: "Respaldo",
  encyclopedia: "Enciclopedia",
  watcher: "Watcher",
};

export const ACTION_LABELS: Record<string, string> = {
  captured: "Captura",
  transcribed: "Transcripción",
  purified: "Purificación",
  approved: "Aprobado",
  rejected: "Rechazado",
  extracted_tasks: "Tareas extraídas",
  extracted_events: "Eventos extraídos",
  journal_saved: "Diario guardado",
  chat_turn: "Turno de chat",
  meta_processed: "Metadatos procesados",
  notebook_processed: "Cuaderno procesado",
  molecular_validated: "Partícula validada",
  kg_ingested: "KG ingerido",
  indexed: "Indexado",
  vibe_calibrated: "Vibe calibrado",
  health_recorded: "Registro de salud",
  encyclopedia_generated: "Entrada enciclopedia",
  backup_exported: "Respaldo exportado",
  backup_imported: "Respaldo importado",
  watcher_analyzed: "Video analizado",
};
