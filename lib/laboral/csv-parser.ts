import { LABORAL_CSV_COLUMNS, type LaboralChallengeRow } from "@/lib/laboral/types";

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvRows(content: string): string[][] {
  const normalized = content.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = "";
  };

  const pushRow = () => {
    if (currentRow.length > 0 || currentField.length > 0) {
      pushField();
      rows.push(currentRow);
      currentRow = [];
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && char === delimiter) {
        pushField();
        continue;
      }

      currentField += char;
    }

    if (inQuotes) {
      currentField += "\n";
    } else {
      pushRow();
    }
  }

  if (inQuotes || currentField.length > 0 || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildHeaderIndex(headers: string[]): Map<string, number> {
  const index = new Map<string, number>();

  headers.forEach((header, position) => {
    index.set(normalizeHeader(header), position);
  });

  return index;
}

function getCell(
  row: string[],
  headerIndex: Map<string, number>,
  columnName: string,
): string {
  const position = headerIndex.get(normalizeHeader(columnName));
  if (position === undefined) return "";
  return (row[position] ?? "").trim();
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/%/g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseExcelSerialDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const serial = Number(trimmed);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
}

function isDataRow(row: LaboralChallengeRow): boolean {
  return row.title.length > 0 || row.id.length > 0;
}

export function parseLaboralCsv(content: string): LaboralChallengeRow[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];

  const [headerRow, ...dataRows] = rows;
  const headerIndex = buildHeaderIndex(headerRow);
  const requiredTitle = normalizeHeader(LABORAL_CSV_COLUMNS.title);

  if (!headerIndex.has(requiredTitle)) {
    throw new Error(
      `CSV inválido: falta la columna "${LABORAL_CSV_COLUMNS.title}". Exportá el Excel con las columnas originales.`,
    );
  }

  const challenges: LaboralChallengeRow[] = [];

  for (const row of dataRows) {
    const title = getCell(row, headerIndex, LABORAL_CSV_COLUMNS.title);
    const id =
      getCell(row, headerIndex, LABORAL_CSV_COLUMNS.id) ||
      String(challenges.length + 1);

    const parsed: LaboralChallengeRow = {
      id,
      title,
      onda: getCell(row, headerIndex, LABORAL_CSV_COLUMNS.onda) || "SIN ÁREA",
      responsable: getCell(row, headerIndex, LABORAL_CSV_COLUMNS.responsable),
      prioridad: parseNumber(getCell(row, headerIndex, LABORAL_CSV_COLUMNS.prioridad)) ?? 1,
      impacto: parseNumber(getCell(row, headerIndex, LABORAL_CSV_COLUMNS.impacto)) ?? 1,
      dificultad: parseNumber(getCell(row, headerIndex, LABORAL_CSV_COLUMNS.dificultad)),
      horasEstimadas: parseNumber(
        getCell(row, headerIndex, LABORAL_CSV_COLUMNS.horasEstimadas),
      ),
      horasRealizadas: parseNumber(
        getCell(row, headerIndex, LABORAL_CSV_COLUMNS.horasRealizadas),
      ),
      avancePorcentaje: parseNumber(
        getCell(row, headerIndex, LABORAL_CSV_COLUMNS.avancePorcentaje),
      ),
      estado: getCell(row, headerIndex, LABORAL_CSV_COLUMNS.estado) || "Idea",
      createdAt: parseExcelSerialDate(
        getCell(row, headerIndex, LABORAL_CSV_COLUMNS.createdAt),
      ),
      targetDate: parseExcelSerialDate(
        getCell(row, headerIndex, LABORAL_CSV_COLUMNS.targetDate),
      ),
      observaciones: getCell(row, headerIndex, LABORAL_CSV_COLUMNS.observaciones),
      puntosMejora: getCell(row, headerIndex, LABORAL_CSV_COLUMNS.puntosMejora),
    };

    if (isDataRow(parsed)) {
      challenges.push(parsed);
    }
  }

  return challenges;
}
