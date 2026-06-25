import { CRITICAL_TABLE_SECTIONS } from "@/lib/memorias/catalog";
import { tableFingerprint } from "@/lib/memorias/tables";
import type { MemoriaAlert, MemoriaExercise } from "@/lib/memorias/types";

function findSection(exercise: MemoriaExercise, sectionNumber: number) {
  return exercise.sections.find((section) => section.number === sectionNumber);
}

export function compareTableIntegrity(
  ejercicioN: MemoriaExercise,
  ejercicioN1: MemoriaExercise,
): MemoriaAlert[] {
  const alerts: MemoriaAlert[] = [];
  const sectionsToCheck = new Set<number>([
    ...CRITICAL_TABLE_SECTIONS,
    ...ejercicioN1.sections.map((section) => section.number),
  ]);

  for (const sectionNumber of sectionsToCheck) {
    const previous = findSection(ejercicioN1, sectionNumber);
    const current = findSection(ejercicioN, sectionNumber);

    if (!previous) continue;

    const previousTables = previous.tables;
    if (previousTables.length === 0) continue;

    if (!current) {
      alerts.push({
        kind: "table_missing",
        severity: sectionNumber === 23 ? "error" : "warning",
        sectionNumber,
        message: `La sección ${sectionNumber} existía en ${ejercicioN1.ejercicio} pero no aparece en ${ejercicioN.ejercicio}.`,
      });
      continue;
    }

    const currentByFingerprint = new Map(
      current.tables.map((table) => [tableFingerprint(table), table]),
    );

    for (const previousTable of previousTables) {
      const fingerprint = tableFingerprint(previousTable);
      const currentTable = currentByFingerprint.get(fingerprint);

      if (!currentTable) {
        alerts.push({
          kind: "table_missing",
          severity: sectionNumber === 23 ? "error" : "warning",
          sectionNumber,
          message: `Tabla ausente en ${ejercicioN.ejercicio} (presente en ${ejercicioN1.ejercicio}): ${previousTable.caption ?? previousTable.headers.join(", ")}.`,
          details: {
            fingerprint,
            previousRowCount: previousTable.rowCount,
          },
        });
        continue;
      }

      if (currentTable.isEmpty && !previousTable.isEmpty) {
        alerts.push({
          kind: "table_empty",
          severity: sectionNumber === 23 ? "error" : "warning",
          sectionNumber,
          message: `Tabla vacía en ${ejercicioN.ejercicio} que tenía ${previousTable.rowCount} filas en ${ejercicioN1.ejercicio}: ${currentTable.caption ?? currentTable.headers.join(", ")}.`,
          details: {
            fingerprint,
            previousRowCount: previousTable.rowCount,
          },
        });
      }
    }
  }

  return alerts;
}
