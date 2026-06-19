import { diffLines } from "diff";

import { DUDA_MARKER_REGEX, type PurifierStageSnapshot } from "@/lib/purifier/types";

export type StageStatus = "pending" | "completed" | "failed";

export type DiffLine = {
  type: "same" | "removed" | "added";
  text: string;
};

const LEGACY_DUDA_REGEX = /===DUDA:\s*(.+?)===/gs;
const DIFF_TRUNCATE_CHARS = 50_000;

const META_LABELS: Record<string, string> = {
  removedCount: "Fragmentos eliminados",
  inputChars: "Caracteres entrada",
  outputChars: "Caracteres salida",
  doubtCount: "Marcadores de duda",
  mergedCount: "Párrafos fusionados",
  paragraphsRemoved: "Párrafos duplicados eliminados",
  count: "Esencias extraídas",
  tags: "Preview tags",
  parentCount: "Bloques padre",
  childCount: "Segmentos hijo",
  entityCount: "Entidades KG",
  relationCount: "Relaciones KG",
};

export function hasDudaMarkers(text: string): boolean {
  if (!text) return false;
  const regex = new RegExp(DUDA_MARKER_REGEX.source, DUDA_MARKER_REGEX.flags);
  if (regex.test(text)) return true;
  const legacy = new RegExp(LEGACY_DUDA_REGEX.source, LEGACY_DUDA_REGEX.flags);
  return legacy.test(text);
}

export function getStageStatus(snapshot: PurifierStageSnapshot): StageStatus {
  if (snapshot.error) return "failed";
  if (snapshot.output !== undefined && snapshot.output !== "") return "completed";
  return "pending";
}

export function resolveStageInput(
  snapshot: PurifierStageSnapshot,
  index: number,
  stages: PurifierStageSnapshot[],
  originalText: string,
): string {
  if (snapshot.input !== undefined) return snapshot.input;

  if (snapshot.station === 1) return originalText;

  const byStation = new Map<number, PurifierStageSnapshot>();
  for (const stage of stages) {
    byStation.set(stage.station, stage);
  }

  if (snapshot.station === 4 || snapshot.station === 5 || snapshot.station === 41) {
    return byStation.get(3)?.output ?? stages[index - 1]?.output ?? "";
  }

  if (snapshot.station === 6) {
    const norm = byStation.get(5)?.output ?? "";
    const bodyMatch = norm.match(/##\s+Transcripción purificada\s*\n+([\s\S]*?)$/i);
    if (bodyMatch?.[1]) return bodyMatch[1].trim();
    return byStation.get(3)?.output ?? "";
  }

  const prev = stages[index - 1];
  return prev?.output ?? "";
}

export function isJsonStage(station: number): boolean {
  return station === 4 || station === 6 || station === 41;
}

export function formatJsonOutput(output: string): string {
  try {
    const parsed = JSON.parse(output) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return output;
  }
}

export function computeLineDiff(before: string, after: string): {
  lines: DiffLine[];
  truncated: boolean;
} {
  const totalLen = before.length + after.length;
  const truncated = totalLen > DIFF_TRUNCATE_CHARS;

  const beforeSlice = truncated ? before.slice(0, DIFF_TRUNCATE_CHARS / 2) : before;
  const afterSlice = truncated ? after.slice(0, DIFF_TRUNCATE_CHARS / 2) : after;

  const parts = diffLines(beforeSlice, afterSlice);
  const lines: DiffLine[] = [];

  for (const part of parts) {
    const chunks = part.value.replace(/\n$/, "").split("\n");
    for (const text of chunks) {
      if (part.added) {
        lines.push({ type: "added", text });
      } else if (part.removed) {
        lines.push({ type: "removed", text });
      } else {
        lines.push({ type: "same", text });
      }
    }
  }

  return { lines, truncated };
}

export function formatStageMeta(
  _station: number,
  meta?: Record<string, unknown>,
): string[] {
  if (!meta) return [];

  const labels: string[] = [];

  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    if (key === "tags" && Array.isArray(value)) {
      if (value.length > 0) {
        labels.push(`${META_LABELS.tags}: ${value.join(", ")}`);
      }
      continue;
    }
    const label = META_LABELS[key] ?? key;
    labels.push(`${label}: ${String(value)}`);
  }

  return labels;
}

export function sortStagesForDisplay(
  stages: PurifierStageSnapshot[],
): PurifierStageSnapshot[] {
  return [...stages].sort((a, b) => {
    const order = (s: number) => (s === 41 ? 4.5 : s);
    return order(a.station) - order(b.station);
  });
}
