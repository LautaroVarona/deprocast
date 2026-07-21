import { SaludWorkspace } from "@/components/salud/salud-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salud · DeProcast",
  description:
    "Registro denso de alimentación y entrenamiento con health-broker HITL.",
};

export default function SaludPage() {
  return <SaludWorkspace />;
}
