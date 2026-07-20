/**
 * Sanitización agresiva de texto OCR/tickets y parseo de tablas crudas.
 * Obligatorio antes de capturar prima materia tabular.
 */

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BEL_CHAR = "\u0007";

export type OcrTableRow = {
  elemento: string;
  cantidad: string;
  total: string;
  categoriaSemantica: string;
};

/** Elimina BEL (\u0007) y controles C0 ocultos; normaliza espacios. */
export function sanitizeHiddenChars(text: string): string {
  return text
    .replaceAll(BEL_CHAR, "")
    .replace(CONTROL_CHARS_RE, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitTableLine(line: string): string[] {
  const trimmed = line.trim();
  if (trimmed.includes("|")) {
    return trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => sanitizeHiddenChars(cell));
  }
  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map((cell) => sanitizeHiddenChars(cell));
  }
  // CSV simple (sin comillas anidadas complejas)
  return trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) =>
    sanitizeHiddenChars(cell.replace(/^"|"$/g, "")),
  );
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^[-:]+$/.test(cell.replace(/\s/g, "")) || cell === "");
}

function normalizeHeader(header: string): string {
  return sanitizeHiddenChars(header)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mapColumnIndex(headers: string[]): {
  elemento: number;
  cantidad: number;
  total: number;
  categoria: number;
} {
  const normalized = headers.map(normalizeHeader);
  const find = (...aliases: string[]) =>
    normalized.findIndex((h) => aliases.some((a) => h.includes(a)));

  return {
    elemento: Math.max(0, find("elemento", "item", "producto", "descripcion", "concepto")),
    cantidad: find("cantidad", "qty", "cant", "uds", "unidades"),
    total: find("total", "importe", "precio", "monto", "amount"),
    categoria: find("categoria", "category", "tipo", "semantic"),
  };
}

/**
 * Transforma líneas tabulares crudas (markdown, TSV, CSV) en objetos limpios.
 */
export function parseOcrTableToRows(raw: string): OcrTableRow[] {
  const cleaned = sanitizeHiddenChars(raw);
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) return [];

  let headerCells = splitTableLine(lines[0]);
  let dataStart = 1;

  if (lines.length > 1 && isSeparatorRow(splitTableLine(lines[1]))) {
    dataStart = 2;
  } else if (
    !headerCells.some((h) =>
      /elemento|item|producto|cantidad|total|categoria/i.test(h),
    )
  ) {
    // Sin cabecera reconocible: asumir orden Elemento | Cantidad | Total | Categoría
    headerCells = ["Elemento", "Cantidad", "Total", "Categoría Semántica"];
    dataStart = 0;
  }

  const cols = mapColumnIndex(headerCells);
  const rows: OcrTableRow[] = [];

  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitTableLine(lines[i]);
    if (cells.length === 0 || isSeparatorRow(cells)) continue;

    const elemento = cells[cols.elemento] ?? cells[0] ?? "";
    if (!elemento) continue;

    rows.push({
      elemento,
      cantidad: cols.cantidad >= 0 ? (cells[cols.cantidad] ?? "") : "",
      total: cols.total >= 0 ? (cells[cols.total] ?? "") : "",
      categoriaSemantica:
        cols.categoria >= 0 ? (cells[cols.categoria] ?? "sin-clasificar") : "sin-clasificar",
    });
  }

  return rows;
}

/** Sanitiza y, si parece tabular, anexa un bloque JSON limpio de filas. */
export function sanitizeAndNormalizeTabularText(raw: string): string {
  const cleaned = sanitizeHiddenChars(raw);
  const looksTabular =
    cleaned.includes("|") ||
    cleaned.includes("\t") ||
    /elemento|cantidad|total/i.test(cleaned);

  if (!looksTabular) return cleaned;

  const rows = parseOcrTableToRows(cleaned);
  if (rows.length === 0) return cleaned;

  return [
    cleaned,
    "",
    "<!-- ocr-table-json -->",
    "```json",
    JSON.stringify(rows, null, 2),
    "```",
  ].join("\n");
}
