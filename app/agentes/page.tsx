import { AgentesWorkspace } from "@/components/agentes/agentes-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentes · DeProcast",
  description:
    "Mapa interactivo del ecosistema de agentes y motores cognitivos del exoesqueleto local-first.",
};

export default function AgentesPage() {
  return <AgentesWorkspace />;
}
