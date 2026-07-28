import { PanalWorkspace } from "@/components/hermeneuta/panal-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hermeneuta de Cuadernos · DeProcast",
  description:
    "Panal de Ingesta Visual — digitaliza notas manuscritas y diagramas hacia el Knowledge Graph con HITL.",
};

export default function CamRecorderPage() {
  return <PanalWorkspace />;
}
