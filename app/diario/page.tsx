import { DiarioWorkspace } from "@/components/diario/diario-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diario de Gnosis · DeProcast",
  description:
    "Capturador de conciencia frictionless: diarios, sueños, visiones y dumps mentales hacia Babel.",
};

export default function DiarioPage() {
  return <DiarioWorkspace />;
}
