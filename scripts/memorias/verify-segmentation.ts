import { readFileSync } from "node:fs";
import path from "node:path";

import { analyzeMemoriaReport, segmentMemoria } from "@/lib/memorias/analyze";

const FIXTURES_DIR = path.join(process.cwd(), "lib", "memorias", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log(`OK: ${message}`);
}

function main(): void {
  const correctMemoria = loadFixture("memoria-ejercicio-n.txt");
  const previousMemoria = loadFixture("memoria-ejercicio-n1.txt");
  const buggyMemoria = loadFixture("memoria-agrupamiento-masivo.txt");

  const segmented = segmentMemoria(correctMemoria, "2025");
  const sectionNumbers = segmented.sections.map((section) => section.number);

  assert(
    [7, 8, 9, 10, 11, 12, 23].every((number) => sectionNumbers.includes(number)),
    "Los apartados 7–11, 12 y 23 son entidades independientes",
  );

  for (const number of [7, 8, 9, 10, 11]) {
    const section = segmented.sections.find((item) => item.number === number);
    assert(Boolean(section), `Apartado ${number} presente`);
    assert(
      (section?.body.length ?? 0) > 0,
      `Apartado ${number} tiene cuerpo propio`,
    );
  }

  const fixedFromBuggy = segmentMemoria(buggyMemoria, "2025");
  const fixedNumbers = fixedFromBuggy.sections.map((section) => section.number);
  assert(
    fixedNumbers.includes(8) &&
      fixedNumbers.includes(9) &&
      fixedNumbers.includes(10) &&
      fixedNumbers.includes(11),
    "El parser corrige el agrupamiento masivo: apartados 8–11 separados del 7",
  );

  const analysis = analyzeMemoriaReport({
    ejercicioN: "2025",
    textoN: correctMemoria,
    ejercicioN1: "2024",
    textoN1: previousMemoria,
  });

  assert(analysis.sectionIndependenceOk, "Independencia de apartados sin errores");

  const tableAlerts = analysis.alerts.filter(
    (alert) => alert.kind === "table_missing" || alert.kind === "table_empty",
  );
  assert(
    tableAlerts.some((alert) => alert.sectionNumber === 23),
    "Alerta de integridad: tabla de partes vinculadas desapareció o quedó incompleta en n",
  );

  assert(
    analysis.fiscalChecks.some((check) => check.ok),
    "Coherencia fiscal: al menos un control de la sección 12 es válido",
  );

  console.log("\nVerificación de memorias completada.");
}

main();
