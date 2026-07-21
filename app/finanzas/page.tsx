import { FinanzasWorkspace } from "@/components/finanzas/finanzas-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finanzas · DeProcast",
  description: "Ledger financiero con ingesta HITL y métricas eco-pulse.",
};

export default function FinanzasPage() {
  return <FinanzasWorkspace />;
}
