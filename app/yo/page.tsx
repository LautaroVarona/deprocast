import { YoCommandCenter } from "@/components/yo/yo-command-center";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yo · Exocórtex · DeProcast",
  description:
    "Nodo gravitacional: identidad dual Operador/Exocórtex, conducto directo y calibración vital.",
};

export default function YoPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <YoCommandCenter />
    </div>
  );
}
