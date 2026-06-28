import { LudusLockedArea } from "@/components/ludus/ludus-locked-area";
import { LUDUS_AREAS } from "@/lib/ludus/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trinchera · Ludus · DeProcast",
  description: "Zona de combate contra la fricción — próximamente.",
};

export default function TrincheraPage() {
  const area = LUDUS_AREAS.find((item) => item.id === "trinchera")!;
  return <LudusLockedArea area={area} />;
}
