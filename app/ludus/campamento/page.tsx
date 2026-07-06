import { CampamentoWorkspace } from "@/components/ludus/campamento-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campamento · Ludus · DeProcast",
  description:
    "Preparación meso — energía, rutina semanal y forjado de microtareas.",
};

export default function CampamentoPage() {
  return <CampamentoWorkspace />;
}
