/** Taxonomía estricta de 6 meta tags del Purifier (estación 4). */

export const META_TAG_SLOTS = [
  {
    key: "dominio",
    label: "Dominio",
    description: "Ámbito o campo temático (ej. legal, salud, producto).",
  },
  {
    key: "entidad_cliente",
    label: "Entidad / Cliente",
    description: "Persona, organización o cliente principal involucrado.",
  },
  {
    key: "tipo_accion",
    label: "Tipo de Acción",
    description: "Verbo o tipo de acto (decidir, revisar, enviar, investigar…).",
  },
  {
    key: "concepto_principal_1",
    label: "Concepto Principal 1",
    description: "Primer concepto atómico dominante del texto.",
  },
  {
    key: "concepto_principal_2",
    label: "Concepto Principal 2",
    description: "Segundo concepto atómico dominante del texto.",
  },
  {
    key: "friccion_emocion",
    label: "Fricción / Emoción",
    description: "Fricción, tensión o carga emocional detectada.",
  },
] as const;

export type MetaTagSlotKey = (typeof META_TAG_SLOTS)[number]["key"];

export type StrictMetaTags = Record<MetaTagSlotKey, string>;

export const EMPTY_STRICT_META_TAGS: StrictMetaTags = {
  dominio: "",
  entidad_cliente: "",
  tipo_accion: "",
  concepto_principal_1: "",
  concepto_principal_2: "",
  friccion_emocion: "",
};

export const META_TAG_SLOT_COUNT = META_TAG_SLOTS.length;

export const EXTRACT_STRICT_META_TAGS_PROMPT = `Eres el extractor de esencias del sistema DeProcast.

Analiza el texto limpio y devolvé EXACTAMENTE un objeto JSON con estas 6 claves obligatorias (todas string, en español, no vacías si el texto aporta señal):

{
  "dominio": "ámbito temático",
  "entidad_cliente": "persona, org o cliente principal",
  "tipo_accion": "tipo de acto o verbo dominante",
  "concepto_principal_1": "concepto atómico 1",
  "concepto_principal_2": "concepto atómico 2",
  "friccion_emocion": "fricción, tensión o emoción"
}

Reglas estrictas:
1. Siempre devolvés las 6 claves, ni más ni menos.
2. Valores cortos (1–5 palabras). Sin explicaciones fuera del JSON.
3. Si falta señal para un slot, usá "sin-señal".
4. No inventes entidades propias que no estén en el texto.
5. Responde ÚNICAMENTE con el objeto JSON.`;

function cleanTag(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^["']|["']$/g, "").slice(0, 80);
}

export function isStrictMetaTags(value: unknown): value is StrictMetaTags {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return META_TAG_SLOTS.every((slot) => typeof record[slot.key] === "string");
}

/** Normaliza cualquier salida LLM / legacy a exactamente 6 tags ordenados. */
export function normalizeStrictMetaTags(raw: unknown): StrictMetaTags {
  const result: StrictMetaTags = { ...EMPTY_STRICT_META_TAGS };

  if (isStrictMetaTags(raw)) {
    for (const slot of META_TAG_SLOTS) {
      result[slot.key] = cleanTag(raw[slot.key]) || "sin-señal";
    }
    return result;
  }

  if (Array.isArray(raw)) {
    const values = raw.map(cleanTag).filter(Boolean);
    META_TAG_SLOTS.forEach((slot, index) => {
      result[slot.key] = values[index] || "sin-señal";
    });
    return result;
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const slot of META_TAG_SLOTS) {
      const aliases = [
        slot.key,
        slot.label,
        slot.label.toLowerCase(),
        slot.key.replace(/_/g, "-"),
        slot.key.replace(/_/g, " "),
      ];
      for (const alias of aliases) {
        const cleaned = cleanTag(record[alias]);
        if (cleaned) {
          result[slot.key] = cleaned;
          break;
        }
      }
      if (!result[slot.key]) result[slot.key] = "sin-señal";
    }
    return result;
  }

  return {
    dominio: "sin-señal",
    entidad_cliente: "sin-señal",
    tipo_accion: "sin-señal",
    concepto_principal_1: "sin-señal",
    concepto_principal_2: "sin-señal",
    friccion_emocion: "sin-señal",
  };
}

export function strictMetaTagsToArray(tags: StrictMetaTags): string[] {
  return META_TAG_SLOTS.map((slot) => tags[slot.key] || "sin-señal");
}

export function arrayToStrictMetaTags(tags: string[]): StrictMetaTags {
  return normalizeStrictMetaTags(tags);
}

export function parseStrictMetaTagsJson(raw: string): StrictMetaTags {
  try {
    return normalizeStrictMetaTags(JSON.parse(raw) as unknown);
  } catch {
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return normalizeStrictMetaTags(JSON.parse(objectMatch[0]) as unknown);
      } catch {
        // fall through
      }
    }
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return normalizeStrictMetaTags(JSON.parse(arrayMatch[0]) as unknown);
      } catch {
        // fall through
      }
    }
  }
  return normalizeStrictMetaTags(null);
}
