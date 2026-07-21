import "server-only";

import { prisma } from "@/lib/prisma";
import { FINANCIAL_CAPITAL_ID } from "@/lib/finanzas/constants";
import type {
  BrokerDraft,
  FinancialCapitalDto,
  FinancialTransactionDto,
  transactionUpdateSchema,
} from "@/lib/finanzas/types";
import type { z } from "zod";

type TransactionRecord = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  concept: string;
  vendor: string | null;
  incomeCategory: string | null;
  expenseTier: string | null;
  projectLabel: string | null;
  status: string;
  sourceChannel: string;
  sourceRaw: string | null;
  confidence: number | null;
  occurredAt: Date;
  isRecurring: boolean;
  isActive: boolean;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(record: TransactionRecord): FinancialTransactionDto {
  return {
    id: record.id,
    type: record.type as FinancialTransactionDto["type"],
    amount: record.amount,
    currency: record.currency,
    concept: record.concept,
    vendor: record.vendor,
    incomeCategory: record.incomeCategory as FinancialTransactionDto["incomeCategory"],
    expenseTier: record.expenseTier as FinancialTransactionDto["expenseTier"],
    projectLabel: record.projectLabel,
    status: record.status as FinancialTransactionDto["status"],
    sourceChannel: record.sourceChannel as FinancialTransactionDto["sourceChannel"],
    sourceRaw: record.sourceRaw,
    confidence: record.confidence,
    occurredAt: record.occurredAt.toISOString(),
    isRecurring: record.isRecurring,
    isActive: record.isActive,
    approvedAt: record.approvedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function ensureFinancialCapital(): Promise<FinancialCapitalDto> {
  const row = await prisma.financialCapital.upsert({
    where: { id: FINANCIAL_CAPITAL_ID },
    create: { id: FINANCIAL_CAPITAL_ID },
    update: {},
  });

  return {
    amount: row.amount,
    currency: row.currency,
    note: row.note,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCapital(): Promise<FinancialCapitalDto> {
  return ensureFinancialCapital();
}

export async function updateCapital(input: {
  amount: number;
  currency?: string;
  note?: string | null;
}): Promise<FinancialCapitalDto> {
  const row = await prisma.financialCapital.upsert({
    where: { id: FINANCIAL_CAPITAL_ID },
    create: {
      id: FINANCIAL_CAPITAL_ID,
      amount: input.amount,
      currency: input.currency ?? "EUR",
      note: input.note ?? null,
    },
    update: {
      amount: input.amount,
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    },
  });

  return {
    amount: row.amount,
    currency: row.currency,
    note: row.note,
    updatedAt: row.updatedAt.toISOString(),
  };
}


export async function createPendingTransaction(input: {
  draft: BrokerDraft;
  sourceChannel: string;
  sourceRaw?: string;
}): Promise<FinancialTransactionDto> {
  const { draft, sourceChannel, sourceRaw } = input;
  const occurredAt = draft.occurredAt ? new Date(draft.occurredAt) : new Date();

  const record = await prisma.financialTransaction.create({
    data: {
      type: draft.type,
      amount: draft.amount,
      currency: draft.currency ?? "EUR",
      concept: draft.concept,
      vendor: draft.vendor ?? null,
      incomeCategory: draft.type === "ingreso" ? (draft.incomeCategory ?? null) : null,
      expenseTier: draft.type === "egreso" ? (draft.expenseTier ?? null) : null,
      projectLabel: draft.projectLabel ?? null,
      status: "pending",
      sourceChannel,
      sourceRaw: sourceRaw ?? null,
      confidence: draft.confidence ?? null,
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      isRecurring: draft.isRecurring ?? false,
      isActive: draft.isActive ?? true,
    },
  });

  return toDto(record);
}

export async function listTransactions(
  status?: string,
): Promise<FinancialTransactionDto[]> {
  const records = await prisma.financialTransaction.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { occurredAt: "desc" }],
  });

  return records.map(toDto);
}

export async function updateTransaction(
  id: string,
  patch: z.infer<typeof transactionUpdateSchema>,
): Promise<FinancialTransactionDto> {
  const existing = await prisma.financialTransaction.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Transacción no encontrada.");
  }

  const nextType = patch.type ?? existing.type;
  const record = await prisma.financialTransaction.update({
    where: { id },
    data: {
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.concept !== undefined ? { concept: patch.concept } : {}),
      ...(patch.vendor !== undefined ? { vendor: patch.vendor } : {}),
      ...(patch.incomeCategory !== undefined
        ? { incomeCategory: nextType === "ingreso" ? patch.incomeCategory : null }
        : {}),
      ...(patch.expenseTier !== undefined
        ? { expenseTier: nextType === "egreso" ? patch.expenseTier : null }
        : {}),
      ...(patch.projectLabel !== undefined ? { projectLabel: patch.projectLabel } : {}),
      ...(patch.occurredAt !== undefined
        ? { occurredAt: new Date(patch.occurredAt) }
        : {}),
      ...(patch.isRecurring !== undefined ? { isRecurring: patch.isRecurring } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    },
  });

  return toDto(record);
}

export async function approveTransaction(id: string): Promise<FinancialTransactionDto> {
  const existing = await prisma.financialTransaction.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Transacción no encontrada.");
  }
  if (existing.status === "confirmed") {
    return toDto(existing);
  }
  if (existing.status === "rejected") {
    throw new Error("No se puede aprobar una transacción rechazada.");
  }

  const delta = existing.type === "ingreso" ? existing.amount : -existing.amount;

  const record = await prisma.$transaction(async (tx) => {
    await tx.financialCapital.upsert({
      where: { id: FINANCIAL_CAPITAL_ID },
      create: { id: FINANCIAL_CAPITAL_ID, amount: delta },
      update: { amount: { increment: delta } },
    });

    return tx.financialTransaction.update({
      where: { id },
      data: {
        status: "confirmed",
        approvedAt: new Date(),
      },
    });
  });

  return toDto(record);
}

export async function approveAllPending(): Promise<FinancialTransactionDto[]> {
  const pending = await prisma.financialTransaction.findMany({
    where: { status: "pending" },
    orderBy: { occurredAt: "asc" },
  });

  const approved: FinancialTransactionDto[] = [];
  for (const item of pending) {
    approved.push(await approveTransaction(item.id));
  }

  return approved;
}

export async function rejectTransaction(id: string): Promise<FinancialTransactionDto> {
  const existing = await prisma.financialTransaction.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Transacción no encontrada.");
  }

  const record = await prisma.financialTransaction.update({
    where: { id },
    data: { status: "rejected" },
  });

  return toDto(record);
}

export async function countPending(): Promise<number> {
  return prisma.financialTransaction.count({ where: { status: "pending" } });
}
