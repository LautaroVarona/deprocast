import { ProyectosDashboard } from "@/components/proyectos/proyectos-dashboard";

export const metadata = {
  title: "Proyectos · Deprocast",
  description: "Tablero maestro de proyectos organizados por Campo en el Atanor local.",
};

export default function ProyectosPage() {
  return <ProyectosDashboard />;
}
