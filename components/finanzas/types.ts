"use client";

import type { EcoPulseMetrics, FinancialTransactionDto } from "@/lib/finanzas/types";

export type InputModality = "text" | "image" | "audio";

export type FinanzasState = {
  transactions: FinancialTransactionDto[];
  metrics: EcoPulseMetrics | null;
  isLoading: boolean;
  isIngesting: boolean;
};
