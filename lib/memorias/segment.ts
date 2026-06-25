import {
  getCanonicalSectionTitle,
  titleMatchesSection,
} from "@/lib/memorias/catalog";
import { extractTablesFromBody } from "@/lib/memorias/tables";
import type {
  MemoriaAlert,
  MemoriaExercise,
  MemoriaSection,
  MemoriaSubsection,
} from "@/lib/memorias/types";

/**
 * Encabezado de apartado de primer nivel: número entero sin subíndice (7, 8, 9…).
 * Subapartados (7.1, 7.2) se anidan dentro del apartado padre.
 */
const TOP_LEVEL_SECTION_RE =
  /^(?:#{1,4}\s+)?(?:(?:Nota|Apartado|Seccion|Sección)\s+)?(\d{1,2})\s*[-–—.:]?\s*(.+?)\s*$/i;

const SUBSECTION_RE =
  /^(?:#{1,4}\s+)?(?:(?:Nota|Apartado)\s+)?(\d{1,2})\.(\d+)\s*[-–—.:]?\s*(.+?)\s*$/i;

type ParsedBoundary = {
  number: number;
  title: string;
  lineStart: number;
  isSubsection: boolean;
  subNumber?: number;
};

function parseBoundaries(lines: string[]): ParsedBoundary[] {
  const boundaries: ParsedBoundary[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]?.trim() ?? "";
    if (!line) continue;

    const subMatch = line.match(SUBSECTION_RE);
    if (subMatch) {
      boundaries.push({
        number: Number.parseInt(subMatch[1], 10),
        subNumber: Number.parseInt(subMatch[2], 10),
        title: subMatch[3].trim(),
        lineStart: lineIndex,
        isSubsection: true,
      });
      continue;
    }

    const topMatch = line.match(TOP_LEVEL_SECTION_RE);
    if (!topMatch) continue;

    const number = Number.parseInt(topMatch[1], 10);
    const title = topMatch[2].trim();

    // Evita confundir "7.1 Título" capturado como "7" + ".1 Título"
    if (/^\d/.test(title)) continue;

    boundaries.push({
      number,
      title,
      lineStart: lineIndex,
      isSubsection: false,
    });
  }

  return boundaries;
}

function sliceBody(lines: string[], start: number, end: number): string {
  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
}

function buildSubsections(
  parentNumber: number,
  bodyLines: string[],
  bodyStartLine: number,
): MemoriaSubsection[] {
  const subBoundaries = parseBoundaries(bodyLines).filter(
    (boundary) => boundary.isSubsection && boundary.number === parentNumber,
  );

  if (subBoundaries.length === 0) return [];

  return subBoundaries.map((boundary, index) => {
    const next = subBoundaries[index + 1];
    const localEnd = next ? next.lineStart : bodyLines.length;
    const body = sliceBody(bodyLines, boundary.lineStart, localEnd);
    const subsectionKey = `${parentNumber}.${boundary.subNumber}`;

    return {
      number: subsectionKey,
      title: boundary.title,
      body,
      tables: extractTablesFromBody(body, parentNumber),
    };
  });
}

function detectAbsorbedSections(sections: MemoriaSection[]): MemoriaAlert[] {
  const alerts: MemoriaAlert[] = [];

  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = sections[index];
    const next = sections[index + 1];

    if (next.number <= current.number) {
      alerts.push({
        kind: "section_absorbed",
        severity: "error",
        sectionNumber: next.number,
        message: `El apartado ${next.number} (${next.title}) aparece anidado o desordenado respecto al apartado ${current.number}.`,
        details: {
          currentSection: current.number,
          nextSection: next.number,
        },
      });
    }
  }

  return alerts;
}

export function segmentMemoria(rawText: string, ejercicio: string): MemoriaExercise {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const topLevelBoundaries = parseBoundaries(lines).filter(
    (boundary) => !boundary.isSubsection,
  );

  const sections: MemoriaSection[] = topLevelBoundaries.map((boundary, index) => {
    const next = topLevelBoundaries[index + 1];
    const lineEnd = next ? next.lineStart - 1 : lines.length - 1;
    const sectionLines = lines.slice(boundary.lineStart, lineEnd + 1);
    const body = sliceBody(sectionLines, 0, sectionLines.length);
    const canonicalTitle = getCanonicalSectionTitle(boundary.number, boundary.title);

    return {
      number: boundary.number,
      title: boundary.title,
      canonicalTitle,
      body,
      subsections: buildSubsections(boundary.number, sectionLines, boundary.lineStart),
      tables: extractTablesFromBody(body, boundary.number),
      lineStart: boundary.lineStart,
      lineEnd,
    };
  });

  return {
    ejercicio,
    sections,
    rawText: normalized,
  };
}

export function validateSectionIndependence(exercise: MemoriaExercise): MemoriaAlert[] {
  const alerts: MemoriaAlert[] = [];

  for (const section of exercise.sections) {
    if (!titleMatchesSection(section.number, section.title)) {
      alerts.push({
        kind: "section_absorbed",
        severity: "warning",
        sectionNumber: section.number,
        message: `El título detectado "${section.title}" no coincide con el catálogo del apartado ${section.number} (${section.canonicalTitle}).`,
      });
    }
  }

  alerts.push(...detectAbsorbedSections(exercise.sections));

  const independentNumbers = new Set(exercise.sections.map((section) => section.number));
  for (const required of [7, 8, 9, 10, 11]) {
    if (
      exercise.sections.some((section) => section.number === 7) &&
      exercise.sections.some((section) => section.number === 11) &&
      !independentNumbers.has(required)
    ) {
      alerts.push({
        kind: "section_missing",
        severity: "error",
        sectionNumber: required,
        message: `Falta el apartado ${required} (${getCanonicalSectionTitle(required, "")}) como entidad independiente.`,
      });
    }
  }

  return alerts;
}
