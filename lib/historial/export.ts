import type { ActivityEntry } from "@/lib/historial/types";
import { ACTION_LABELS, CATEGORY_LABELS } from "@/lib/historial/types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function activityEntriesToJson(entries: ActivityEntry[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    },
    null,
    2,
  );
}

export function activityEntriesToCsv(entries: ActivityEntry[]): string {
  const headers = [
    "occurredAt",
    "category",
    "categoryLabel",
    "action",
    "actionLabel",
    "title",
    "summary",
    "agentId",
    "agentName",
    "modelUsed",
    "sourceType",
    "sourceRef",
    "correlationId",
  ];

  const rows = entries.map((entry) =>
    [
      entry.occurredAt,
      entry.category,
      CATEGORY_LABELS[entry.category] ?? entry.category,
      entry.action,
      ACTION_LABELS[entry.action] ?? entry.action,
      entry.title,
      entry.summary ?? "",
      entry.agentId ?? "",
      entry.agentName ?? "",
      entry.modelUsed ?? "",
      entry.sourceType ?? "",
      entry.sourceRef ?? "",
      entry.correlationId ?? "",
    ]
      .map((cell) => escapeCsv(String(cell)))
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
