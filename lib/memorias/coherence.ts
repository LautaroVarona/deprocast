import { normalizeMemoriaText } from "@/lib/memorias/catalog";
import type {
  FiscalCoherenceCheck,
  MemoriaAlert,
  MemoriaExercise,
  MemoriaTable,
} from "@/lib/memorias/types";

const FISCAL_FIELD_PATTERNS: Record<string, RegExp[]> = {
  baseImponible: [
    /base\s+imponible/,
    /beneficio\s+antes\s+de\s+impuestos/,
    /resultado\s+antes\s+de\s+impuestos/,
  ],
  cuotaIntegra: [/cuota\s+integra/, /cuota\s+del\s+impuesto/],
  cuotaLiquida: [/cuota\s+liquida/, /impuesto\s+a\s+pagar/],
  deducciones: [/deducciones/, /bonificaciones/],
};

function parseSpanishAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  if (!cleaned || cleaned === "-" || cleaned === "—") return null;

  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  return headers.findIndex((header) => {
    const normalized = normalizeMemoriaText(header);
    return patterns.some((pattern) => pattern.test(normalized));
  });
}

function extractAmountFromTable(
  table: MemoriaTable,
  patterns: RegExp[],
): number | null {
  const columnIndex = findColumnIndex(table.headers, patterns);
  if (columnIndex === -1) return null;

  for (const row of table.rows) {
    const amount = parseSpanishAmount(row[columnIndex] ?? "");
    if (amount !== null) return amount;
  }

  return null;
}

function extractLabeledAmount(body: string, labelPatterns: RegExp[]): number | null {
  const lines = body.split("\n");
  for (const line of lines) {
    const normalized = normalizeMemoriaText(line);
    if (!labelPatterns.some((pattern) => pattern.test(normalized))) continue;

    const amountMatch = line.match(/(-?\d[\d.,]*)\s*€?/);
    if (amountMatch) {
      return parseSpanishAmount(amountMatch[1]);
    }
  }
  return null;
}

export function verifyFiscalCoherence(
  exercise: MemoriaExercise,
): { checks: FiscalCoherenceCheck[]; alerts: MemoriaAlert[] } {
  const section = exercise.sections.find((item) => item.number === 12);
  const checks: FiscalCoherenceCheck[] = [];
  const alerts: MemoriaAlert[] = [];

  if (!section) {
    return { checks, alerts };
  }

  const fiscalTables = section.tables;
  const primaryTable = fiscalTables[0];

  const amounts: Record<string, number | null> = {
    baseImponible:
      (primaryTable
        ? extractAmountFromTable(primaryTable, FISCAL_FIELD_PATTERNS.baseImponible)
        : null) ??
      extractLabeledAmount(section.body, FISCAL_FIELD_PATTERNS.baseImponible),
    cuotaIntegra:
      (primaryTable
        ? extractAmountFromTable(primaryTable, FISCAL_FIELD_PATTERNS.cuotaIntegra)
        : null) ??
      extractLabeledAmount(section.body, FISCAL_FIELD_PATTERNS.cuotaIntegra),
    cuotaLiquida:
      (primaryTable
        ? extractAmountFromTable(primaryTable, FISCAL_FIELD_PATTERNS.cuotaLiquida)
        : null) ??
      extractLabeledAmount(section.body, FISCAL_FIELD_PATTERNS.cuotaLiquida),
    deducciones:
      (primaryTable
        ? extractAmountFromTable(primaryTable, FISCAL_FIELD_PATTERNS.deducciones)
        : null) ??
      extractLabeledAmount(section.body, FISCAL_FIELD_PATTERNS.deducciones),
  };

  if (amounts.cuotaIntegra !== null && amounts.deducciones !== null && amounts.cuotaLiquida !== null) {
    const expectedLiquida = amounts.cuotaIntegra - amounts.deducciones;
    const delta = Math.abs(expectedLiquida - amounts.cuotaLiquida);
    const ok = delta < 0.01;

    checks.push({
      field: "cuotaLiquida = cuotaIntegra - deducciones",
      expected: expectedLiquida,
      actual: amounts.cuotaLiquida,
      delta,
      ok,
    });

    if (!ok) {
      alerts.push({
        kind: "fiscal_mismatch",
        severity: "error",
        sectionNumber: 12,
        message: `Incoherencia en Situación Fiscal: la cuota líquida (${amounts.cuotaLiquida}) no coincide con cuota íntegra menos deducciones (${expectedLiquida}).`,
        details: {
          cuotaIntegra: amounts.cuotaIntegra,
          deducciones: amounts.deducciones,
          cuotaLiquida: amounts.cuotaLiquida,
          delta,
        },
      });
    }
  }

  if (fiscalTables.length > 1 && amounts.baseImponible !== null) {
    const breakdownTable = fiscalTables[1];
    const breakdownColumn = findColumnIndex(breakdownTable.headers, [/importe/, /cuota/, /base/]);
    let breakdownSum = 0;
    let parsedRows = 0;

    if (breakdownColumn !== -1) {
      for (const row of breakdownTable.rows) {
        const value = parseSpanishAmount(row[breakdownColumn] ?? "");
        if (value !== null) {
          breakdownSum += value;
          parsedRows += 1;
        }
      }
    }

    if (parsedRows > 0) {
      const delta = Math.abs(breakdownSum - amounts.baseImponible);
      const tolerance = Math.max(1, amounts.baseImponible * 0.001);
      const ok = delta <= tolerance;

      checks.push({
        field: "desglose impuestos vs base imponible",
        expected: amounts.baseImponible,
        actual: breakdownSum,
        delta,
        ok,
      });

      if (!ok) {
        alerts.push({
          kind: "fiscal_mismatch",
          severity: "error",
          sectionNumber: 12,
          message: `El desglose de impuestos (${breakdownSum}) no cuadra con la base imponible (${amounts.baseImponible}).`,
          details: { breakdownSum, baseImponible: amounts.baseImponible, delta },
        });
      }
    }
  }

  return { checks, alerts };
}
