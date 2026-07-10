import { CampamentoWorkspace } from "@/components/ludus/campamento-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forja · Campamento · Ludus · DeProcast",
  description: "Forjado de microtareas y energía semanal del Campamento.",
};

export default function CampamentoForjaPage() {
  return <CampamentoWorkspace />;
}
