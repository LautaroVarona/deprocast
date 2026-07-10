import { CampamentoHub } from "@/components/ludus/campamento-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campamento · Ludus · DeProcast",
  description:
    "Preparación meso — universos de Babel, jornada temporal y asaltos del día.",
};

export default function CampamentoPage() {
  return <CampamentoHub />;
}
