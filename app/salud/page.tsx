import { SaludWorkspace } from "@/components/salud/salud-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salud · DeProcast",
  description:
    "Telemetría de salud: rendimiento, combustible, recuperación y estado base.",
};

export default function SaludPage() {
  return <SaludWorkspace />;
}
