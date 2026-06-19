import { CalibradorWorkspace } from "@/components/vibe-calibrator/calibrador-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calibrador · DeProcast",
  description:
    "Vibe Calibrator: calibración HITL de pesos gravitacionales (1–12).",
};

export default function CalibradorPage() {
  return <CalibradorWorkspace />;
}
