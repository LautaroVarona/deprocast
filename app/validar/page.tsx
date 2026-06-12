import { ValidarWorkspace } from "@/components/validar/validar-workspace";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Validar · DeProcast",
  description: "Aduana humana: revisión y coagulación del conocimiento purificado.",
};

export default function ValidarPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
            Cargando aduana…
          </div>
        }
      >
        <ValidarWorkspace />
      </Suspense>
    </div>
  );
}
