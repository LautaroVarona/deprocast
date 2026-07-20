import { TacticalHud } from "@/components/hud/tactical-hud";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HUD Táctico · Deprocast",
  description:
    "Inyección de pulso, radar del Atanor y trinchera — home táctico de Deprocast OS.",
};

export default function HomePage() {
  return <TacticalHud />;
}
