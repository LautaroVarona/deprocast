import { YoCommandCenter } from "@/components/yo/yo-command-center";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yo · Centro de Mando · DeProcast",
  description:
    "Nodo Cero del Observador: perfil operativo, energía y calibración continua.",
};

export default function YoPage() {
  return <YoCommandCenter />;
}
