import { parseStructuredTable } from "@/lib/ingesta/tablas/parser";
import { sanitizeHiddenChars } from "@/lib/utils/text-sanitizer";

function escapeCell(value: string): string {
  return sanitizeHiddenChars(value.replace(/\|/g, "\\|").replace(/\n/g, " "));
}

export async function tableBufferToRawText(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const { headers, records } = await parseStructuredTable(buffer, filename);

  if (headers.length === 0) {
    throw new Error("La tabla no contiene cabeceras reconocibles.");
  }

  if (records.length === 0) {
    throw new Error("La tabla no contiene filas de datos.");
  }

  const headerRow = `| ${headers.map(escapeCell).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const dataRows = records.map(
    (record) =>
      `| ${headers.map((header) => escapeCell(record[header] ?? "")).join(" | ")} |`,
  );

  return [
    `# Prima materia tabular: ${filename}`,
    "",
    `Filas: ${records.length} · Columnas: ${headers.length}`,
    "",
    headerRow,
    separator,
    ...dataRows,
  ].join("\n");
}
