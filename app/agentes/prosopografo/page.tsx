import { ProsopografoWorkspace } from "@/components/agentes/prosopografo-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prosopógrafo · DeProcast",
  description:
    "Cuestionario CRM 6×6 para LLMs externos e importación JSON de personas.",
};

export default function ProsopografoPage() {
  return <ProsopografoWorkspace />;
}
