import { PersonasDashboard } from "@/components/personas/personas-dashboard";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Personas · Deprocast",
  description:
    "CRM de contexto — stakeholders, aliases y menciones del grafo de conocimiento.",
};

export default function PersonasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center font-mono text-[10px] text-muted-foreground">
          Cargando personas…
        </div>
      }
    >
      <PersonasDashboard />
    </Suspense>
  );
}
