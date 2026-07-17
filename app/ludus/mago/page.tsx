import { MagoWorkspace } from "@/components/mago/mago-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mago 22 · Ludus · DeProcast",
  description:
    "Matriz hermética de 22 niveles: letras hebreas, tarot y dimensiones Deprocast.",
};

export default function MagoPage() {
  return <MagoWorkspace lensId="mago-22" />;
}
