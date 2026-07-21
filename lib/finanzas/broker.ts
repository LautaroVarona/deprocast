import "server-only";

import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";
import {
  EXPENSE_TIERS,
  INCOME_CATEGORIES,
  SUGGESTED_PROJECTS,
} from "@/lib/finanzas/constants";
import { brokerDraftSchema, type BrokerDraft } from "@/lib/finanzas/types";

const FINANCIAL_BROKER_PROMPT = `Sos financial-broker, agente de ingesta financiera de Deprocast OS. Analizá la entrada del operador y devolvé ÚNICAMENTE JSON válido (sin markdown) con esta forma:
{
  "type": "ingreso" | "egreso",
  "amount": número positivo,
  "currency": "EUR" u otra ISO 4217,
  "concept": "descripción corta del movimiento",
  "vendor": "comercio o servicio opcional",
  "incomeCategory": "sueldo" | "inversiones" | "pasivos" | "ventas" (solo si type=ingreso),
  "expenseTier": "necesarios" | "primarios" | "secundarios" | "terciarios" (solo si type=egreso),
  "projectLabel": uno de [${SUGGESTED_PROJECTS.map((p) => `"${p}"`).join(", ")}] o null,
  "occurredAt": "ISO 8601 opcional si se infiere fecha",
  "isRecurring": boolean (true para suscripciones SaaS mensuales),
  "isActive": boolean (true si es suscripción activa),
  "confidence": 0.0 a 1.0,
  "notes": "observaciones breves opcionales"
}

Taxonomía de egresos (tiers):
- necesarios: impuestos, alquiler, comida base
- primarios: operatividad, documentación, vestimenta
- secundarios: ocio, contingencias, imprevistos
- terciarios: SaaS y software (Cursor, Google Pro, Vercel, Supabase, Perplexity, etc.)

Taxonomía de ingresos:
- sueldo: nómina fija
- inversiones: rendimientos de inversiones
- pasivos: ingresos pasivos
- ventas: ventas o consultoría

Reglas:
- Inferí ingreso vs egreso por contexto (gasté/pagué/cobré/recibí).
- Para suscripciones SaaS usa expenseTier=terciarios, isRecurring=true, isActive=true.
- Si no hay proyecto claro, projectLabel puede ser null o "Personal".
- No inventes montos; si el monto es ambiguo, estimá con confidence baja.
- No incluyas campos extra fuera del schema.`;

export async function extractFinancialDraftFromText(
  text: string,
  context?: string,
): Promise<BrokerDraft> {
  const userContent = context
    ? `${context}\n\n---\nEntrada financiera:\n${text}`
    : text;

  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: FINANCIAL_BROKER_PROMPT,
      userContent,
      modelKind: "fast",
      jsonMode: true,
      throttle: true,
    }),
  );

  try {
    const parsed = JSON.parse(raw);
    const draft = brokerDraftSchema.parse(parsed);

    if (draft.type === "ingreso" && !draft.incomeCategory) {
      draft.incomeCategory = inferIncomeCategory(text);
    }
    if (draft.type === "egreso" && !draft.expenseTier) {
      draft.expenseTier = inferExpenseTier(text);
    }

    return draft;
  } catch {
    return fallbackDraft(text);
  }
}

function inferIncomeCategory(text: string): (typeof INCOME_CATEGORIES)[number] {
  const lower = text.toLowerCase();
  if (/sueldo|nómina|nomina|salario/.test(lower)) return "sueldo";
  if (/inversi|dividendo|rendimiento/.test(lower)) return "inversiones";
  if (/pasivo|alquiler recibido|royalt/.test(lower)) return "pasivos";
  return "ventas";
}

function inferExpenseTier(text: string): (typeof EXPENSE_TIERS)[number] {
  const lower = text.toLowerCase();
  if (/cursor|vercel|supabase|google pro|perplexity|saas|suscripci/.test(lower)) {
    return "terciarios";
  }
  if (/alquiler|impuesto|comida|supermercado|luz|agua|gas/.test(lower)) {
    return "necesarios";
  }
  if (/ocio|cine|restaurante|imprevisto|contingencia/.test(lower)) {
    return "secundarios";
  }
  if (/documentaci|vestimenta|ropa|operativ/.test(lower)) {
    return "primarios";
  }
  return "secundarios";
}

function fallbackDraft(text: string): BrokerDraft {
  const amountMatch = text.match(/(\d+[.,]\d{2}|\d+)/);
  const amount = amountMatch
    ? Number.parseFloat(amountMatch[1].replace(",", "."))
    : 1;
  const isIncome = /cobr|recib|ingres|sueldo|venta|honorario/.test(
    text.toLowerCase(),
  );

  return {
    type: isIncome ? "ingreso" : "egreso",
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
    currency: /usd|\$|dólar|dolar/.test(text.toLowerCase()) ? "USD" : "EUR",
    concept: text.trim().slice(0, 120) || "Movimiento financiero",
    incomeCategory: isIncome ? inferIncomeCategory(text) : undefined,
    expenseTier: isIncome ? undefined : inferExpenseTier(text),
    confidence: 0.3,
    notes: "Análisis parcial — entrada sin estructura clara.",
  };
}
