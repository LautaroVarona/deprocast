import { z } from "zod";

import {
  EXPENSE_TIERS,
  INCOME_CATEGORIES,
  SOURCE_CHANNELS,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from "@/lib/finanzas/constants";

export const brokerDraftSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive(),
  currency: z.string().min(1).default("EUR"),
  concept: z.string().min(1),
  vendor: z.string().optional(),
  incomeCategory: z.enum(INCOME_CATEGORIES).optional(),
  expenseTier: z.enum(EXPENSE_TIERS).optional(),
  projectLabel: z.string().optional(),
  occurredAt: z.string().optional(),
  isRecurring: z.boolean().optional(),
  isActive: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export type BrokerDraft = z.infer<typeof brokerDraftSchema>;

export const transactionUpdateSchema = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().min(1).optional(),
  concept: z.string().min(1).optional(),
  vendor: z.string().nullable().optional(),
  incomeCategory: z.enum(INCOME_CATEGORIES).nullable().optional(),
  expenseTier: z.enum(EXPENSE_TIERS).nullable().optional(),
  projectLabel: z.string().nullable().optional(),
  occurredAt: z.string().optional(),
  isRecurring: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const capitalUpdateSchema = z.object({
  amount: z.number(),
  currency: z.string().min(1).optional(),
  note: z.string().nullable().optional(),
});

export type FinancialTransactionDto = {
  id: string;
  type: (typeof TRANSACTION_TYPES)[number];
  amount: number;
  currency: string;
  concept: string;
  vendor: string | null;
  incomeCategory: (typeof INCOME_CATEGORIES)[number] | null;
  expenseTier: (typeof EXPENSE_TIERS)[number] | null;
  projectLabel: string | null;
  status: (typeof TRANSACTION_STATUSES)[number];
  sourceChannel: (typeof SOURCE_CHANNELS)[number];
  sourceRaw: string | null;
  confidence: number | null;
  occurredAt: string;
  isRecurring: boolean;
  isActive: boolean;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialCapitalDto = {
  amount: number;
  currency: string;
  note: string | null;
  updatedAt: string;
};

export type SaasSubscriptionDto = {
  id: string;
  vendor: string;
  concept: string;
  amount: number;
  currency: string;
  projectLabel: string | null;
  isRecurring: boolean;
};

export type EcoPulseMetrics = {
  capital: FinancialCapitalDto;
  runway: {
    months: number;
    vitalMonthlyBurn: number;
    capitalAmount: number;
  };
  burn: {
    vitalMonthly: number;
    operationalMonthly: number;
    ratio: number;
  };
  saas: SaasSubscriptionDto[];
  pendingCount: number;
};
