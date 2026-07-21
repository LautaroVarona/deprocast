import type { EcoPulseMetrics, FinancialTransactionDto } from "@/lib/finanzas/types";

export async function fetchMetrics(): Promise<EcoPulseMetrics> {
  const response = await fetch("/api/finanzas/metrics", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudieron cargar las métricas.");
  }
  return data.metrics;
}

export async function fetchPendingTransactions(): Promise<FinancialTransactionDto[]> {
  const response = await fetch("/api/finanzas/transactions?status=pending", {
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudieron cargar los pendientes.");
  }
  return data.transactions ?? [];
}

export async function ingestFinancial(input: {
  modality: "text" | "audio" | "image";
  text?: string;
  file?: File;
}): Promise<FinancialTransactionDto> {
  const formData = new FormData();
  formData.set("modality", input.modality);
  if (input.text) formData.set("text", input.text);
  if (input.file) formData.set("file", input.file);

  const response = await fetch("/api/finanzas/ingest", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo procesar la ingesta.");
  }
  return data.transaction;
}

export async function approveTransaction(id: string): Promise<FinancialTransactionDto> {
  const response = await fetch(`/api/finanzas/transactions/${id}/approve`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo aprobar.");
  }
  return data.transaction;
}

export async function rejectTransaction(id: string): Promise<void> {
  const response = await fetch(`/api/finanzas/transactions/${id}/reject`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo rechazar.");
  }
}

export async function approveAllPending(): Promise<number> {
  const response = await fetch("/api/finanzas/transactions/approve-all", {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudieron aprobar los pendientes.");
  }
  return data.count ?? 0;
}

export async function updateCapital(amount: number): Promise<void> {
  const response = await fetch("/api/finanzas/capital", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo actualizar el capital.");
  }
}

export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
