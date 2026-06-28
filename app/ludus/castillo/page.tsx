import { CastilloWorkspace } from "@/components/castillo/castillo-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Castillo · Ludus · DeProcast",
  description:
    "Canvas futurista para clasificar y organizar todo el corpus con libertad absoluta.",
};

export default function CastilloPage() {
  return <CastilloWorkspace />;
}
