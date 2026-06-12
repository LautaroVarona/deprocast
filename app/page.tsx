import { AssetsTable } from "@/components/assets-table";
import { ActiveBosses } from "@/components/home/active-bosses";
import { GnosisMetrics } from "@/components/home/gnosis-metrics";
import { QuickIngestCard } from "@/components/home/quick-ingest-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Centro de Control
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          El estado del Exoesqueleto Cognitivo de un vistazo: señal acumulada,
          materia prima en cola y los Bosses que exigen enfoque hoy.
        </p>
      </header>

      <GnosisMetrics />

      <ActiveBosses />

      <QuickIngestCard />

      <Card>
        <CardHeader>
          <CardTitle>Materia procesada</CardTitle>
          <CardDescription>
            Audios ingestados, cola de esterilización y transcripciones
            descargables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetsTable refreshKey={0} />
        </CardContent>
      </Card>
    </div>
  );
}
