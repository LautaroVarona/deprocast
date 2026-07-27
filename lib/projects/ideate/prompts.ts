import type { IdeateLlmOutput } from "@/lib/projects/ideate/schema";
import { PROJECT_TIPOS } from "@/lib/projects/types";
import { MAGO3_PHASES } from "@/lib/yo/types";

export function buildIdeatePrompt(
  title: string,
  brainDump: string,
  mentionHints: string[],
): string {
  const hints =
    mentionHints.length > 0
      ? `\nMenciones explícitas del operador (prioridad sobre inferencias):\n- ${mentionHints.join("\n- ")}`
      : "";

  return `Sos el motor de destilación de proyectos de Deprocast.
A partir del título y del brain dump, devolvé SOLO un JSON válido (sin markdown) con este shape:

{
  "short_pitch": "pitch corto en 1-2 oraciones",
  "domain": "dominio semántico breve (ej. producto, ops, personal)",
  "suggested_campo_slug": "slug opcional snake_case si se infiere un campo",
  "suggested_tipo": ${JSON.stringify(PROJECT_TIPOS)} o omitir,
  "moscow_tasks": [
    { "title": "tarea accionable", "priority": "must|should|could|wont", "notes": "opcional" }
  ],
  "suggested_energy_cost": entero 1-12,
  "suggested_mago_phase": ${JSON.stringify(MAGO3_PHASES)},
  "suggested_mago12": entero 1-12 opcional,
  "suggested_person_labels": ["nombres de personas detectadas"],
  "suggested_tags": ["etiquetas o áreas"]
}

Reglas:
- short_pitch y domain son obligatorios.
- moscow_tasks: máximo 24; priorizá Must/Should; titles accionables.
- suggested_energy_cost: fricción operativa estimada (1 bajo, 12 alto).
- suggested_mago_phase: fase temporal sugerida según el texto.
- No inventes IDs; solo labels.
- Si el dump es pobre, igual devolvé pitch mínimo y energy 6.

Título: ${title.trim()}
Brain dump:
"""
${brainDump.trim() || "(vacío)"}
"""
${hints}`;
}

export function formatMentionHints(
  mentions: { prefix: "@" | "#"; label: string }[],
): string[] {
  return mentions.map((m) => `${m.prefix}${m.label}`);
}

/** Prompt corto para reintentos / debug. */
export function describeIdeateOutput(output: IdeateLlmOutput): string {
  return `${output.short_pitch} · ${output.domain} · AP ${output.suggested_energy_cost}`;
}
