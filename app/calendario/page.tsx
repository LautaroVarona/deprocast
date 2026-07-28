import { CalendarioWorkspace } from "@/components/calendario/calendario-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tablero del Tiempo · DeProcast",
  description:
    "Castillo · Campamento · Trinchera — coagulación de misiones en el tiempo real.",
};

export default function CalendarioPage() {
  return <CalendarioWorkspace />;
}
