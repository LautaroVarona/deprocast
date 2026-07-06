import { TrincheraWorkspace } from "@/components/ludus/trinchera-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trinchera · Ludus · DeProcast",
  description:
    "Ejecución micro — bloques de foco extremo con Binauralizer Gamma.",
};

export default function TrincheraPage() {
  return <TrincheraWorkspace />;
}
