import type { ActivityEntry } from "@/lib/historial/types";
import { CATEGORY_LABELS } from "@/lib/historial/types";

export const CATEGORY_ICONS: Record<string, string> = {
  ingesta: "📥",
  audio: "🎙️",
  purifier: "🧪",
  validation: "✅",
  chat: "💬",
  events: "📅",
  salud: "🫀",
  kg: "🕸️",
  molecular: "🔬",
  meta: "🏷️",
  cuadernos: "📓",
  ludus: "⚔️",
  vibe: "🎛️",
  journal: "📔",
  backup: "💾",
  encyclopedia: "📚",
  watcher: "📹",
};

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveSourceLink(entry: ActivityEntry): string | null {
  if (entry.category === "purifier" || entry.category === "validation") {
    return entry.correlationId ? `/validar?id=${entry.correlationId}` : "/validar";
  }
  if (entry.category === "audio" && entry.sourceRef) {
    return `/audio/${entry.sourceRef}`;
  }
  if (entry.category === "chat") {
    return "/chat";
  }
  if (entry.category === "journal") {
    return "/diario";
  }
  if (entry.category === "meta") {
    return "/agentes";
  }
  if (entry.category === "ingesta") {
    return "/ingesta";
  }
  if (entry.category === "salud") {
    return "/salud";
  }
  if (entry.category === "cuadernos") {
    return entry.correlationId
      ? `/ingesta/cuadernos/${entry.correlationId}`
      : "/ingesta/cuadernos";
  }
  if (entry.category === "molecular") {
    return "/molecular";
  }
  if (entry.category === "vibe") {
    return "/calibrador";
  }
  if (entry.category === "kg") {
    return "/grafo";
  }
  if (entry.category === "encyclopedia" && entry.sourceRef) {
    return `/enciclopedia?entry=${entry.sourceRef}`;
  }
  if (entry.category === "backup") {
    return "/respaldo";
  }
  if (entry.category === "watcher") {
    return "/cam-recorder";
  }
  return null;
}

export function buildDayCategorySummary(entries: ActivityEntry[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const label = CATEGORY_LABELS[entry.category] ?? entry.category;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => `${count} ${label}`)
    .join(" · ");
}

export type ExportFormat = "json" | "csv" | "csv-coach" | "md-coach";

export function buildHistorialExportUrl(
  format: ExportFormat,
  filters: {
    category?: string;
    agentId?: string;
    selectedDay?: string | null;
    days?: number;
  } = {},
): string {
  const params = new URLSearchParams({
    format,
    days: String(filters.days ?? 30),
  });
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.agentId && filters.agentId !== "all") {
    params.set("agentId", filters.agentId);
  }
  if (filters.selectedDay) {
    params.set("day", filters.selectedDay);
  }
  return `/api/historial/export?${params}`;
}
