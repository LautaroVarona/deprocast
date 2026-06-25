import { verifyFiscalCoherence } from "@/lib/memorias/coherence";
import { compareTableIntegrity } from "@/lib/memorias/integrity";
import {
  segmentMemoria,
  validateSectionIndependence,
} from "@/lib/memorias/segment";
import type { MemoriaAnalysisResult } from "@/lib/memorias/types";

export type AnalyzeMemoriaInput = {
  ejercicioN: string;
  textoN: string;
  ejercicioN1?: string;
  textoN1?: string;
};

export function analyzeMemoriaReport(
  input: AnalyzeMemoriaInput,
): MemoriaAnalysisResult {
  const ejercicioN = segmentMemoria(input.textoN, input.ejercicioN);
  const independenceAlerts = validateSectionIndependence(ejercicioN);

  const ejercicioN1 =
    input.textoN1 && input.ejercicioN1
      ? segmentMemoria(input.textoN1, input.ejercicioN1)
      : undefined;

  const integrityAlerts =
    ejercicioN1 !== undefined
      ? compareTableIntegrity(ejercicioN, ejercicioN1)
      : [];

  const fiscal = verifyFiscalCoherence(ejercicioN);

  const alerts = [
    ...independenceAlerts,
    ...integrityAlerts,
    ...fiscal.alerts,
  ];

  const sectionIndependenceOk = !independenceAlerts.some(
    (alert) => alert.severity === "error",
  );

  return {
    ejercicioN,
    ejercicioN1,
    alerts,
    fiscalChecks: fiscal.checks,
    sectionIndependenceOk,
  };
}

export { segmentMemoria, validateSectionIndependence } from "@/lib/memorias/segment";
export { compareTableIntegrity } from "@/lib/memorias/integrity";
export { verifyFiscalCoherence } from "@/lib/memorias/coherence";
