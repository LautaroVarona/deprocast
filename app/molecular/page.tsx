import { MolecularWorkspace } from "@/components/molecular/molecular-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Motor Molecular · DeProcast",
  description:
    "Chunkeador Semántico y Calibrador Central — pipeline de partículas con validación HITL.",
};

export default function MolecularPage() {
  return <MolecularWorkspace />;
}
