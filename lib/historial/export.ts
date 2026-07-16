import type { ActivityEntry } from "@/lib/historial/types";
import { ACTION_LABELS, CATEGORY_LABELS } from "@/lib/historial/types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatStageAgentsSummary(metadata: Record<string, unknown>): string {
  if (!Array.isArray(metadata.stageAgents)) {
    return "";
  }

  return (
    metadata.stageAgents as Array<{
      station?: number;
      name?: string;
      agentName?: string;
    }>
  )
    .map((stage) => {
      const label = stage.station != null ? `Est.${stage.station}` : "Est.";
      const name = stage.name ?? "";
      const agent = stage.agentName ?? "";
      return `${label} ${name} → ${agent}`.trim();
    })
    .join(" | ");
}

function formatInterventionSummary(entry: ActivityEntry): string {
  const parts: string[] = [];
  if (entry.agentName) parts.push(entry.agentName);
  if (entry.modelUsed) parts.push(entry.modelUsed);
  return parts.join(" · ");
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

const BASE_CSV_HEADERS = [
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
] as const;

const COACH_CSV_HEADERS = [
  ...BASE_CSV_HEADERS,
  "interventionSummary",
  "stageAgentsSummary",
  "metadataJson",
] as const;

function entryToBaseCsvRow(entry: ActivityEntry): string[] {
  return [
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
  ];
}

export function activityEntriesToCsv(
  entries: ActivityEntry[],
  options?: { coach?: boolean },
): string {
  const coach = options?.coach ?? false;
  const headers = coach ? COACH_CSV_HEADERS : BASE_CSV_HEADERS;

  const rows = entries.map((entry) => {
    const base = entryToBaseCsvRow(entry);
    if (!coach) {
      return base.map((cell) => escapeCsv(String(cell))).join(",");
    }

    return [
      ...base,
      formatInterventionSummary(entry),
      formatStageAgentsSummary(entry.metadata),
      JSON.stringify(entry.metadata),
    ]
      .map((cell) => escapeCsv(String(cell)))
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

function formatStageAgentsMarkdown(metadata: Record<string, unknown>): string {
  if (!Array.isArray(metadata.stageAgents) || metadata.stageAgents.length === 0) {
    return "";
  }

  const lines = (
    metadata.stageAgents as Array<{
      station?: number;
      name?: string;
      agentName?: string;
    }>
  ).map((stage) => {
    const label = stage.station != null ? `Estación ${stage.station}` : "Estación";
    return `- **${label}** (${stage.name ?? "—"}) → ${stage.agentName ?? "—"}`;
  });

  return `\n**Intervenciones por estación:**\n${lines.join("\n")}\n`;
}

export function activityEntriesToMarkdown(entries: ActivityEntry[]): string {
  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    "# Historial de actividad — Deprocast",
    "",
    `> Exportado: ${exportedAt} · ${entries.length} evento${entries.length === 1 ? "" : "s"}`,
    "",
    "Documento orientado a coaches y profesionales. Cada entrada indica categoría, acción, agente e IA utilizada.",
    "",
  ];

  let currentDay = "";

  for (const entry of entries) {
    const dayKey = entry.occurredAt.slice(0, 10);
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      const date = new Date(entry.occurredAt);
      const dayLabel = date.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      lines.push(`---`, "", `## ${dayLabel}`, "");
    }

    const time = new Date(entry.occurredAt).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const category = CATEGORY_LABELS[entry.category] ?? entry.category;
    const action = ACTION_LABELS[entry.action] ?? entry.action;

    lines.push(`### ${time} — ${entry.title}`);
    lines.push("");
    lines.push(
      `| Campo | Valor |`,
      `| --- | --- |`,
      `| Categoría | ${category} |`,
      `| Acción | ${action} |`,
    );

    if (entry.agentName) {
      lines.push(`| Agente | ${entry.agentName}${entry.agentId ? ` (\`${entry.agentId}\`)` : ""} |`);
    }
    if (entry.modelUsed) {
      lines.push(`| Modelo IA | ${entry.modelUsed} |`);
    }
    if (entry.summary) {
      lines.push(`| Resumen | ${entry.summary.replace(/\|/g, "\\|")} |`);
    }

    lines.push("");

    const stageBlock = formatStageAgentsMarkdown(entry.metadata);
    if (stageBlock) {
      lines.push(stageBlock);
    }

    if (entry.sourceType || entry.sourceRef) {
      lines.push(
        `*Fuente: ${entry.sourceType ?? "—"}${entry.sourceRef ? ` · ref \`${entry.sourceRef}\`` : ""}*`,
        "",
      );
    }
  }

  return lines.join("\n");
}
