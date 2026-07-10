import { TrincheraHub } from "@/components/ludus/trinchera-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trinchera · Ludus · DeProcast",
  description:
    "Universos de Babel, asaltos de la jornada y ejecución micro dentro de Ludus.",
};

export default function TrincheraPage() {
  return <TrincheraHub />;
}
