import { ProyectosDashboard } from "@/components/proyectos/proyectos-dashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Proyectos · Deprocast",
  description: "Tablero maestro de proyectos organizados por Campo en el Atanor local.",
};

export default function ProyectosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center font-mono text-[10px] text-muted-foreground">
          Cargando proyectos…
        </div>
      }
    >
      <ProyectosDashboard />
    </Suspense>
  );
}
