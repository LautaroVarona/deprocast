import { BinauralizerWorkspace } from "@/components/binauralizer/binauralizer-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Binauralizer · DeProcast",
  description:
    "Generador local de tonos binaurales — modula tu estado cognitivo con Web Audio API.",
};

export default function BinauralizerPage() {
  return <BinauralizerWorkspace />;
}
