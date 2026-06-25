import type {
  AreasRelevancia,
  MetaMeteadorOutput,
  MetadataDelTodo,
} from "@/lib/meta-meteador/types";
import { META_AREAS, normalizeAreasRelevancia } from "@/lib/meta-meteador/types";

function parseMetadataDelTodo(raw: unknown): MetadataDelTodo {
  const item =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const str = (key: string) =>
    typeof item[key] === "string" ? (item[key] as string).trim() : "";

  return {
    materia: str("materia") || "sin-clasificar",
    particula: str("particula") || "sin-clasificar",
    campo: str("campo") || "sin-clasificar",
    onda: str("onda") || "sin-clasificar",
    tiempo_espacio: str("tiempo_espacio") || "sin-clasificar",
    posicion: str("posicion") || "sin-clasificar",
  };
}

function parseObject(raw: unknown, expectedId: string): MetaMeteadorOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const id =
    typeof data.id_documento === "string" ? data.id_documento.trim() : expectedId;
  const titulo =
    typeof data.titulo === "string" ? data.titulo.trim() : "";

  if (!titulo) return null;

  const areasRaw =
    data.areas_relevancia && typeof data.areas_relevancia === "object"
      ? (data.areas_relevancia as Partial<
          Record<string, { score_1_12?: number; porcentaje?: number }>
        >)
      : {};

  return {
    id_documento: id || expectedId,
    titulo,
    metadata_del_todo: parseMetadataDelTodo(data.metadata_del_todo),
    areas_relevancia: normalizeAreasRelevancia(areasRaw),
  };
}

export function parseMetaMeteadorOutput(
  raw: string,
  expectedId: string,
): MetaMeteadorOutput | null {
  const trimmed = raw.trim();

  try {
    return parseObject(JSON.parse(trimmed), expectedId);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return parseObject(JSON.parse(fenced[1].trim()), expectedId);
      } catch {
        // continue
      }
    }

    const bracket = trimmed.match(/\{[\s\S]*\}/);
    if (bracket) {
      try {
        return parseObject(JSON.parse(bracket[0]), expectedId);
      } catch {
        // ignore
      }
    }
  }

  return null;
}

export function countWords(title: string): number {
  return title.trim().split(/\s+/).filter(Boolean).length;
}

export function isValidGeneratedTitle(title: string): boolean {
  const words = countWords(title);
  return words >= 3 && words <= 7;
}

export { META_AREAS };
export type { AreasRelevancia, MetaMeteadorOutput };
