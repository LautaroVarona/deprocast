import { ValidarShell } from "@/components/validar/validar-shell";
import { listTriageQueue } from "@/lib/cortex/triage-queue";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Validar · DeProcast",
  description:
    "Motor de Triage de Fricción Cero — HITL para PendingTasks, Quántomos y aristas.",
};

export default async function ValidarPage() {
  await ensureRuntimeReady();
  const triageItems = await listTriageQueue();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
            Cargando cola de entropía…
          </div>
        }
      >
        <ValidarShell initialTriageItems={triageItems} />
      </Suspense>
    </div>
  );
}
