import { LudusLockedArea } from "@/components/ludus/ludus-locked-area";
import { LUDUS_AREAS } from "@/lib/ludus/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campamento · Ludus · DeProcast",
  description: "Base de operaciones — próximamente.",
};

export default function CampamentoPage() {
  const area = LUDUS_AREAS.find((item) => item.id === "campamento")!;
  return <LudusLockedArea area={area} />;
}
