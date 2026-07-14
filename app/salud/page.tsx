import { SaludWorkspace } from "@/components/salud/salud-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salud · DeProcast",
  description:
    "Telemetría, alimentación, deporte y métricas de bienestar.",
};

export default function SaludPage() {
  return <SaludWorkspace />;
}
