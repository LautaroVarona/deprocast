import { TrincheraWorkspace } from "@/components/ludus/trinchera-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trinchera · Ludus · DeProcast",
  description:
    "Ejecución micro — Laboratorio Sonoro, binaurales y bloques de foco extremo.",
};

export default function TrincheraPage() {
  return <TrincheraWorkspace />;
}
