import type { Metadata } from "next";
import { getOrCreateTodaySession } from "@/lib/jornada/actions";
import { AtanorWorkspace } from "@/components/jornada/atanor-workspace";

export const metadata: Metadata = {
  title: "Atanor Temporal · Jornada · DeProcast",
  description: "Workspace Diario Unificado — hilos paralelos, chat con Cohere y coagulación de jornada.",
};

export default async function JornadaPage() {
  const result = await getOrCreateTodaySession();

  if (!result.ok) {
    return (
      <div className="jornada-noir-root flex h-[calc(100dvh-3.5rem)] items-center justify-center">
        <p className="font-mono text-sm text-red-400">{result.error}</p>
      </div>
    );
  }

  return <AtanorWorkspace initialSession={result.data} />;
}
