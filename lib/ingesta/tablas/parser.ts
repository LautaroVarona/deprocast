function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const tabs = (headerLine.match(/\t/g) ?? []).length;

  if (tabs >= commas && tabs >= semicolons && tabs > 0) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function parseDelimitedRows(content: string): string[][] {
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

function rowsToObjects(rows: string[][]): {
  headers: string[];
  records: Record<string, string>[];
} {
  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header, index) => header.trim() || `columna_${index + 1}`);
  const records: Record<string, string>[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (row.every((cell) => !cell.trim())) continue;

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? "").trim();
    });
    records.push(record);
  }

  return { headers, records };
}

function parseCsvBuffer(buffer: Buffer): {
  headers: string[];
  records: Record<string, string>[];
} {
  const content = buffer.toString("utf-8");
  const rows = parseDelimitedRows(content);
  return rowsToObjects(rows);
}

async function parseXlsxBuffer(buffer: Buffer): Promise<{
  headers: string[];
  records: Record<string, string>[];
}> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { headers: [], records: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(
    sheet,
    { header: 1, defval: "", raw: false },
  ) as (string | number | boolean | Date | null)[][];

  if (matrix.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = matrix[0].map((cell, index) => {
    const value = String(cell ?? "").trim();
    return value || `columna_${index + 1}`;
  });

  const records: Record<string, string>[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    const values = row.map((cell) => {
      if (cell instanceof Date) {
        return cell.toISOString().slice(0, 10);
      }
      return String(cell ?? "").trim();
    });

    if (values.every((value) => !value)) continue;

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    records.push(record);
  }

  return { headers, records };
}

export async function parseStructuredTable(
  buffer: Buffer,
  filename: string,
): Promise<{ headers: string[]; records: Record<string, string>[] }> {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    return parseXlsxBuffer(buffer);
  }

  if (
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".tsv")
  ) {
    return parseCsvBuffer(buffer);
  }

  throw new Error("Formato no soportado. Usá .csv, .tsv, .xlsx o .xls.");
}
