import type { MemoriaTable } from "@/lib/memorias/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function parseMarkdownTable(lines: string[], startIndex: number): {
  table: MemoriaTable | null;
  endIndex: number;
} {
  const headerLine = lines[startIndex]?.trim() ?? "";
  if (!headerLine.startsWith("|")) {
    return { table: null, endIndex: startIndex };
  }

  const separatorLine = lines[startIndex + 1]?.trim() ?? "";
  if (!/^\|?\s*:?-{2,}/.test(separatorLine)) {
    return { table: null, endIndex: startIndex };
  }

  const headers = headerLine
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

  const rows: string[][] = [];
  let cursor = startIndex + 2;

  while (cursor < lines.length) {
    const line = lines[cursor]?.trim() ?? "";
    if (!line.startsWith("|")) break;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length > 0) {
      rows.push(cells);
    }
    cursor += 1;
  }

  const caption =
    startIndex > 0 && /^tabla\b/i.test(lines[startIndex - 1]?.trim() ?? "")
      ? lines[startIndex - 1].trim()
      : null;

  const isEmpty = rows.length === 0 || rows.every((row) => row.every((cell) => !cell));

  return {
    table: {
      id: slugify((caption ?? headers.join("-")) || `table-${startIndex}`),
      caption,
      headers,
      rows,
      rowCount: rows.length,
      isEmpty,
    },
    endIndex: cursor - 1,
  };
}

export function extractTablesFromBody(body: string, sectionNumber: number): MemoriaTable[] {
  const lines = body.split("\n");
  const tables: MemoriaTable[] = [];
  let index = 0;

  while (index < lines.length) {
    const { table, endIndex } = parseMarkdownTable(lines, index);
    if (!table) {
      index += 1;
      continue;
    }

    tables.push({
      ...table,
      id: `s${sectionNumber}-${table.id}`,
    });
    index = endIndex + 1;
  }

  return tables;
}

export function tableFingerprint(table: MemoriaTable): string {
  const headers = table.headers.map((header) => header.toLowerCase().trim()).join("|");
  return `${headers}::${table.caption ?? ""}`;
}
