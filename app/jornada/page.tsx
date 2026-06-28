import { JornadaWorkspace } from "@/components/jornada/jornada-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jornada · Tiempo-Espacio × Partícula · DeProcast",
  description:
    "Ticker de eventos activos y prioridades doradas bajo la Ley del Mínimo Esfuerzo.",
};

export default function JornadaPage() {
  return <JornadaWorkspace />;
}
