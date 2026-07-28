import { PensaderoWorkspace } from "@/components/grafo/pensadero-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pensadero · GraphRAG · DeProcast",
  description:
    "Motor GraphRAG: Quántomos semánticos + órbita borgeana por gravedad hermética.",
};

export default function GrafoPage() {
  return <PensaderoWorkspace />;
}
