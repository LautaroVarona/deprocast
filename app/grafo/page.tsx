import { GrafoWorkspace } from "@/components/grafo/grafo-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grafo de Conocimiento · DeProcast",
  description:
    "Red viva de personas, proyectos, ideas, documentos y código del exoesqueleto cognitivo.",
};

export default function GrafoPage() {
  return <GrafoWorkspace />;
}
