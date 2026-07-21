import "server-only";

import { prisma } from "@/lib/prisma";
import { getCapital, countPending } from "@/lib/finanzas/service";
import type { EcoPulseMetrics, SaasSubscriptionDto } from "@/lib/finanzas/types";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function computeEcoPulseMetrics(
  referenceDate = new Date(),
): Promise<EcoPulseMetrics> {
  const capital = await getCapital();
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);

  const confirmedExpenses = await prisma.financialTransaction.findMany({
    where: {
      status: "confirmed",
      type: "egreso",
      occurredAt: { gte: monthStart, lte: monthEnd },
    },
  });

  const vitalMonthly = confirmedExpenses
    .filter((tx) => tx.expenseTier === "necesarios" || tx.expenseTier === "primarios")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const operationalMonthly = confirmedExpenses.reduce(
    (sum, tx) => sum + tx.amount,
    0,
  );

  const vitalMonthlyBurn = Math.max(1, vitalMonthly);
  const months = capital.amount / vitalMonthlyBurn;

  const saasRows = await prisma.financialTransaction.findMany({
    where: {
      status: "confirmed",
      type: "egreso",
      expenseTier: "terciarios",
      isActive: true,
    },
    orderBy: { amount: "desc" },
  });

  const saasMap = new Map<string, SaasSubscriptionDto>();
  for (const row of saasRows) {
    const key = `${row.vendor ?? row.concept}::${row.projectLabel ?? ""}`;
    if (!saasMap.has(key)) {
      saasMap.set(key, {
        id: row.id,
        vendor: row.vendor ?? row.concept,
        concept: row.concept,
        amount: row.amount,
        currency: row.currency,
        projectLabel: row.projectLabel,
        isRecurring: row.isRecurring,
      });
    }
  }

  const pendingCount = await countPending();

  return {
    capital,
    runway: {
      months: Number.isFinite(months) ? months : 0,
      vitalMonthlyBurn,
      capitalAmount: capital.amount,
    },
    burn: {
      vitalMonthly,
      operationalMonthly,
      ratio:
        operationalMonthly > 0 ? vitalMonthly / operationalMonthly : vitalMonthly > 0 ? 1 : 0,
    },
    saas: [...saasMap.values()],
    pendingCount,
  };
}
