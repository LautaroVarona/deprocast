import "server-only";

import { cohereGenerateJson } from "@/lib/cohere/chat";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";

export type MentalRam = number; // 1–12
export type RunUrgency = "low" | "medium" | "high" | "critical";

export type MagoTraductorInput = {
  /** Disponibilidad de RAM mental (escala hermética 1–12). */
  mentalRam: MentalRam;
  /** Preferencia local-first (SQLite, files, sin SaaS). */
  localFirst: boolean;
  /** Urgencia de la Run actual. */
  urgency: RunUrgency;
  /** Qué se quiere implementar / magia buscada. */
  intent: string;
  /** Stack ya presente (opcional). */
  stackHints?: string[];
};

export type MagoTraductorGuide = {
  recommendedTech: string;
  why: string;
  tutorialSteps: string[];
  codeSnippet: string;
  tokenCostHint: "bajo" | "medio";
  pitfalls: string[];
};

const SYSTEM = `Sos el Mago Traductor: recomendás la "mejor magia disponible" para implementar algo en Deprocast (Next.js, Prisma/SQLite, Cohere, local-first).
Reglas:
- Guías ultra-específicas y cortas (máx ~350 tokens de salida).
- Si mentalRam ≤ 4 o urgency=critical: preferí soluciones mínimas sin deps nuevas.
- Si localFirst=true: evitá SaaS; preferí archivos, SQLite, scripts locales.
- Devolvé SOLO JSON:
  {
    "recommendedTech": string,
    "why": string,
    "tutorialSteps": string[],
    "codeSnippet": string,
    "tokenCostHint": "bajo"|"medio",
    "pitfalls": string[]
  }`;

function clampRam(value: number): MentalRam {
  if (!Number.isFinite(value)) return 6;
  return Math.min(
    MAX_BASE_WEIGHT,
    Math.max(MIN_BASE_WEIGHT, Math.round(value)),
  );
}

function fallbackGuide(input: MagoTraductorInput): MagoTraductorGuide {
  const local = input.localFirst;
  return {
    recommendedTech: local
      ? "Prisma + SQLite + route handler Node"
      : "API route + Cohere JSON",
    why:
      input.urgency === "critical" || input.mentalRam <= 4
        ? "Camino mínimo: un endpoint y persistencia local sin deps nuevas."
        : "Encaja con el stack Deprocast y mantiene el contexto corto.",
    tutorialSteps: [
      "Definí el contrato Zod/JSON de entrada/salida.",
      "Implementá la función en lib/ y exponé POST en app/api/…/route.ts.",
      "Persistí en Prisma/SQLite o data/ según el dominio.",
      "Cableá un FeedbackSignal si hay HITL.",
    ],
    codeSnippet: `export async function POST(req: Request) {
  const body = await req.json();
  // validar → ejecutar → persistir
  return Response.json({ ok: true });
}`,
    tokenCostHint: "bajo",
    pitfalls: [
      "No saturar el prompt del chat con tutoriales largos.",
      "No introducir Gemini/Vertex: el runtime es Cohere.",
    ],
  };
}

export async function runMagoTraductor(
  input: MagoTraductorInput,
): Promise<MagoTraductorGuide> {
  const mentalRam = clampRam(input.mentalRam);
  const normalized: MagoTraductorInput = {
    ...input,
    mentalRam,
    intent: input.intent.trim(),
    stackHints: input.stackHints?.filter(Boolean) ?? [],
  };

  if (!normalized.intent) {
    throw new Error("Se requiere intent: qué magia querés implementar.");
  }

  try {
    const result = await cohereGenerateJson<Partial<MagoTraductorGuide>>({
      systemPrompt: SYSTEM,
      userContent: JSON.stringify(normalized),
      temperature: 0.2,
      maxTokens: 500,
      throttle: true,
    });

    const fallback = fallbackGuide(normalized);
    return {
      recommendedTech:
        result.recommendedTech?.trim() || fallback.recommendedTech,
      why: result.why?.trim() || fallback.why,
      tutorialSteps:
        Array.isArray(result.tutorialSteps) && result.tutorialSteps.length
          ? result.tutorialSteps.map(String).slice(0, 8)
          : fallback.tutorialSteps,
      codeSnippet: result.codeSnippet?.trim() || fallback.codeSnippet,
      tokenCostHint:
        result.tokenCostHint === "medio" || result.tokenCostHint === "bajo"
          ? result.tokenCostHint
          : fallback.tokenCostHint,
      pitfalls:
        Array.isArray(result.pitfalls) && result.pitfalls.length
          ? result.pitfalls.map(String).slice(0, 5)
          : fallback.pitfalls,
    };
  } catch (error) {
    console.warn("Mago Traductor Cohere fallback:", error);
    return fallbackGuide(normalized);
  }
}
