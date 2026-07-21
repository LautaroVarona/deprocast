"use client";

import { BurnPulse } from "@/components/finanzas/burn-pulse";
import { CapitalPanel } from "@/components/finanzas/capital-panel";
import { IngestBox } from "@/components/finanzas/ingest-box";
import { PendingApprovals } from "@/components/finanzas/pending-approvals";
import { RunwayVital } from "@/components/finanzas/runway-vital";
import { SaasSemaphore } from "@/components/finanzas/saas-semaphore";
import type { InputModality } from "@/components/finanzas/types";
import type { EcoPulseMetrics, FinancialTransactionDto } from "@/lib/finanzas/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function FinanzasWorkspace() {
  const [text, setText] = useState("");
  const [modality, setModality] = useState<InputModality>("text");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransactionDto[]>([]);
  const [metrics, setMetrics] = useState<EcoPulseMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const pending = useMemo(
    () => transactions.filter((tx) => tx.status === "pending"),
    [transactions],
  );

  const refresh = useCallback(async () => {
    try {
      const [txRes, metricsRes] = await Promise.all([
        fetch("/api/finanzas/transactions", { cache: "no-store" }),
        fetch("/api/finanzas/metrics", { cache: "no-store" }),
      ]);

      const txData = await txRes.json();
      const metricsData = await metricsRes.json();

      if (!txRes.ok) throw new Error(txData.error ?? "Error al cargar transacciones");
      if (!metricsRes.ok) throw new Error(metricsData.error ?? "Error al cargar métricas");

      setTransactions(txData.transactions ?? []);
      setMetrics(metricsData.metrics ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los datos";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetIngest = () => {
    setText("");
    setImageFile(null);
    setAudioFile(null);
    setModality("text");
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
  };

  const handleImagePick = (file: File) => {
    setImageFile(file);
    setAudioFile(null);
    setModality("image");
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleAudioPick = (file: File) => {
    setAudioFile(file);
    setImageFile(null);
    setModality("audio");
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
  };

  const handleIngest = async () => {
    const activeModality = audioFile ? "audio" : imageFile ? "image" : "text";
    if (activeModality === "text" && !text.trim()) {
      toast.error("Describí el movimiento o adjuntá captura/audio.");
      return;
    }

    setIsIngesting(true);
    try {
      const formData = new FormData();
      formData.set("modality", activeModality);
      if (text.trim()) formData.set("text", text.trim());

      if (activeModality === "image" && imageFile) {
        formData.set("file", imageFile);
      } else if (activeModality === "audio" && audioFile) {
        formData.set("file", audioFile);
      }

      const response = await fetch("/api/finanzas/ingest", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo analizar la entrada");
      }

      toast.success("Borrador generado — pendiente de aprobación");
      resetIngest();
      await refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo procesar la ingesta";
      toast.error(message);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsBusy(true);
    try {
      const response = await fetch(`/api/finanzas/transactions/${id}/approve`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo aprobar");
      toast.success("Transacción confirmada");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aprobar");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReject = async (id: string) => {
    setIsBusy(true);
    try {
      const response = await fetch(`/api/finanzas/transactions/${id}/reject`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo rechazar");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al rechazar");
    } finally {
      setIsBusy(false);
    }
  };

  const handleApproveAll = async () => {
    setIsBusy(true);
    try {
      const response = await fetch("/api/finanzas/transactions/approve-all", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron aprobar");
      toast.success(`${data.count ?? 0} transacciones confirmadas`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aprobar");
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdate = async (
    id: string,
    patch: Partial<FinancialTransactionDto>,
  ) => {
    try {
      const response = await fetch(`/api/finanzas/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al editar");
    }
  };

  const handleCapitalSave = async (amount: number) => {
    try {
      const response = await fetch("/api/finanzas/capital", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success("Capital actualizado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar capital");
    }
  };

  return (
    <div className="finanzas-noir-root flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
          Eco · Finanzas
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          Ledger financiero
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section aria-label="Ingesta rápida">
            <IngestBox
              value={text}
              onChange={setText}
              modality={modality}
              imagePreviewUrl={imagePreviewUrl}
              isProcessing={isIngesting}
              onImagePick={handleImagePick}
              onAudioPick={handleAudioPick}
              onSubmit={() => void handleIngest()}
              disabled={isLoading}
            />
          </section>

          <section aria-label="Pendientes">
            <PendingApprovals
              transactions={pending}
              onApprove={(id) => void handleApprove(id)}
              onReject={(id) => void handleReject(id)}
              onApproveAll={() => void handleApproveAll()}
              onUpdate={(id, patch) => void handleUpdate(id, patch)}
              isBusy={isBusy}
            />
          </section>

          <section aria-label="Métricas" className="grid gap-4 md:grid-cols-2">
            <CapitalPanel
              capital={metrics?.capital ?? null}
              onSave={(amount) => void handleCapitalSave(amount)}
            />
            <RunwayVital metrics={metrics} />
            <BurnPulse metrics={metrics} />
            <SaasSemaphore metrics={metrics} />
          </section>
        </div>
      </div>
    </div>
  );
}
