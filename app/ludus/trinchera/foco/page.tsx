import { TrincheraWorkspace } from "@/components/ludus/trinchera-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foco · Trinchera · Ludus · DeProcast",
  description:
    "Sesión de asalto — bloques de foco extremo con Laboratorio Sonoro.",
};

export default function TrincheraFocoPage() {
  return <TrincheraWorkspace />;
}
