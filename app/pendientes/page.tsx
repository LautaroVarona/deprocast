import { PendientesWorkspace } from "@/components/pendientes/pendientes-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pendientes · DeProcast",
  description:
    "Tareas sugeridas por El Listador, validación y calibración 1–12.",
};

export default function PendientesPage() {
  return <PendientesWorkspace />;
}
