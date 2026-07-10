import { CalendarioWorkspace } from "@/components/calendario/calendario-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendario · DeProcast",
  description: "Vista compacta de eventos y actividades del día.",
};

export default function CalendarioPage() {
  return <CalendarioWorkspace />;
}
