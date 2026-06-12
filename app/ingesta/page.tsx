import { IngestaWorkspace } from "@/components/ingesta/ingesta-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ingesta · DeProcast",
  description:
    "La aduana de la Prima Materia: entrada de audios, textos, tablas y documentos visuales.",
};

export default function IngestaPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <IngestaWorkspace />
    </div>
  );
}
