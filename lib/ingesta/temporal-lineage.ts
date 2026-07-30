import "server-only";

import { getCurrentGameTime } from "@/lib/ingesta/game-time";

export type LineageSource =
  | "filename"
  | "filesystem"
  | "transcript"
  | "game_clock";

export type TemporalLineageResult = {
  timestampExacto: Date;
  fechaLabel: string;
  horaLabel: string;
  lugar: string | null;
  ambientContext: string;
  indefinido: boolean;
  source: LineageSource;
  confidence: number;
  rawHints: string[];
};

const MONTHS: Record<string, number> = {
  ene: 0,
  jan: 0,
  enero: 0,
  february: 1,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  march: 2,
  abr: 3,
  apr: 3,
  abril: 3,
  april: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  june: 5,
  jul: 6,
  julio: 6,
  july: 6,
  ago: 7,
  aug: 7,
  agosto: 7,
  august: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  september: 8,
  oct: 9,
  octubre: 9,
  october: 9,
  nov: 10,
  noviembre: 10,
  november: 10,
  dic: 11,
  dec: 11,
  diciembre: 11,
  december: 11,
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  sunday: 0,
  lunes: 1,
  monday: 1,
  martes: 2,
  tuesday: 2,
  miercoles: 3,
  miércoles: 3,
  wednesday: 3,
  jueves: 4,
  thursday: 4,
  viernes: 5,
  friday: 5,
  sabado: 6,
  sábado: 6,
  saturday: 6,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatFecha(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatHora(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function buildResult(
  date: Date,
  partial: Partial<TemporalLineageResult> & {
    source: LineageSource;
    indefinido: boolean;
  },
): TemporalLineageResult {
  return {
    timestampExacto: date,
    fechaLabel: formatFecha(date),
    horaLabel: formatHora(date),
    lugar: partial.lugar ?? null,
    ambientContext: partial.ambientContext ?? "caminata",
    indefinido: partial.indefinido,
    source: partial.source,
    confidence: partial.confidence ?? (partial.indefinido ? 0.2 : 0.75),
    rawHints: partial.rawHints ?? [],
  };
}

/**
 * Capa A — título del archivo.
 * Patrones: `29_jul__21.09_.mp3`, `2026-07-29_2109.m4a`, `29-07-2026 21.09.wav`
 */
export function extractLineageFromFilename(
  filename: string,
  yearHint = new Date().getFullYear(),
): TemporalLineageResult | null {
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase();
  const hints: string[] = [];

  // 29_jul__21.09  |  29 jul, 19.19  |  29-jul-21.09  |  29_julio_21-09
  const named = base.match(
    /(\d{1,2})[_\-\s,]*(?:(?:en|del)[_\-\s,]*)?(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|oct|octubre|nov|noviembre|dic|diciembre)[_\-\s,]*(?:(?:de|del)[_\-\s,]*)?(\d{1,2})[.\-:](\d{2})/i,
  );
  if (named) {
    const day = Number(named[1]);
    const month = MONTHS[named[2]!.toLowerCase()];
    const hour = Number(named[3]);
    const minute = Number(named[4]);
    if (
      month !== undefined &&
      day >= 1 &&
      day <= 31 &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      const d = new Date(yearHint, month, day, hour, minute, 0, 0);
      hints.push(`filename:${named[0]}`);
      return buildResult(d, {
        source: "filename",
        indefinido: false,
        confidence: 0.92,
        ambientContext: "caminata",
        rawHints: hints,
      });
    }
  }

  // ISO-ish: 2026-07-29_21.09 / 20260729_2109
  const iso = base.match(
    /(20\d{2})[_\-]?(\d{2})[_\-]?(\d{2})[_\sT\-]*(\d{1,2})[.\-:]?(\d{2})/,
  );
  if (iso) {
    const d = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4]),
      Number(iso[5]),
      0,
      0,
    );
    if (!Number.isNaN(d.getTime())) {
      hints.push(`filename-iso:${iso[0]}`);
      return buildResult(d, {
        source: "filename",
        indefinido: false,
        confidence: 0.9,
        ambientContext: "caminata",
        rawHints: hints,
      });
    }
  }

  // 29-07-2026 21.09
  const dmy = base.match(
    /(\d{1,2})[_\-\/.](\d{1,2})[_\-\/.](20\d{2})[_\s\-]*(\d{1,2})[.\-:](\d{2})/,
  );
  if (dmy) {
    const d = new Date(
      Number(dmy[3]),
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      Number(dmy[4]),
      Number(dmy[5]),
      0,
      0,
    );
    if (!Number.isNaN(d.getTime())) {
      hints.push(`filename-dmy:${dmy[0]}`);
      return buildResult(d, {
        source: "filename",
        indefinido: false,
        confidence: 0.88,
        ambientContext: "caminata",
        rawHints: hints,
      });
    }
  }

  return null;
}

/** Capa B — metadatos FS (originalCreatedAt / lastModified). */
export function extractLineageFromFilesystem(
  originalCreatedAt: Date | string | null | undefined,
): TemporalLineageResult | null {
  if (!originalCreatedAt) return null;
  const d =
    originalCreatedAt instanceof Date
      ? originalCreatedAt
      : new Date(originalCreatedAt);
  if (Number.isNaN(d.getTime())) return null;

  // Descartar timestamps absurdos (época 0 / futuro lejano)
  const now = Date.now();
  if (d.getTime() < 946684800000 || d.getTime() > now + 86400000) {
    return null;
  }

  return buildResult(d, {
    source: "filesystem",
    indefinido: false,
    confidence: 0.7,
    ambientContext: "caminata",
    rawHints: [`fs:${d.toISOString()}`],
  });
}

/**
 * Capa C — hermenéutica del contenido transcripto.
 * Ej: "Hoy es lunes al mediodía caminando por Paterna"
 */
export function extractLineageFromTranscript(
  transcript: string,
  referenceDate = new Date(),
): TemporalLineageResult | null {
  const text = transcript.slice(0, 4000);
  const lower = text.toLowerCase();
  const hints: string[] = [];

  let ambientContext = "caminata";
  if (/\bmetro\b|\brenfe\b|\btren\b/.test(lower)) ambientContext = "metro";
  else if (/\boficina\b|\bdespacho\b|\bcowork/.test(lower)) {
    ambientContext = "oficina";
  } else if (/\bcaminat|\bpaseo|\bandando\b|\bcalle\b/.test(lower)) {
    ambientContext = "caminata";
  }

  let lugar: string | null = null;
  const placeMatch = lower.match(
    /(?:por|en|hacia|desde)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,40}?)(?:\.|,|\s+y\s|\s+con\s|$)/,
  );
  // Prefer capitalized place names from original text
  const placeCaps = text.match(
    /(?:por|en|hacia|desde)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s]{2,40}?)(?:\.|,|\s+y\s|\s+con\s|$)/,
  );
  if (placeCaps?.[1]) {
    lugar = placeCaps[1].trim().replace(/\s+/g, " ");
    hints.push(`lugar:${lugar}`);
  } else if (placeMatch?.[1]) {
    lugar = placeMatch[1].trim().replace(/\s+/g, " ");
    hints.push(`lugar:${lugar}`);
  }

  let hour = referenceDate.getHours();
  let minute = referenceDate.getMinutes();
  let hasTime = false;

  if (/\bmediod[ií]a\b|\bal\s+mediod[ií]a\b/.test(lower)) {
    hour = 12;
    minute = 0;
    hasTime = true;
    hints.push("hora:mediodia");
  } else if (/\bmañana\b|\bpor\s+la\s+mañana\b/.test(lower)) {
    hour = 9;
    minute = 0;
    hasTime = true;
    hints.push("hora:manana");
  } else if (/\btarde\b|\bpor\s+la\s+tarde\b/.test(lower)) {
    hour = 17;
    minute = 0;
    hasTime = true;
    hints.push("hora:tarde");
  } else if (/\bnoche\b|\bpor\s+la\s+noche\b/.test(lower)) {
    hour = 21;
    minute = 0;
    hasTime = true;
    hints.push("hora:noche");
  }

  const clock = lower.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (clock) {
    const h = Number(clock[1]);
    const m = Number(clock[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      hour = h;
      minute = m;
      hasTime = true;
      hints.push(`hora:${pad2(h)}:${pad2(m)}`);
    }
  }

  let dayOffset = 0;
  if (/\bayer\b/.test(lower)) {
    dayOffset = -1;
    hints.push("dia:ayer");
  } else if (/\bhoy\b/.test(lower)) {
    hints.push("dia:hoy");
  }

  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) {
      const current = referenceDate.getDay();
      let delta = dow - current;
      if (delta > 0) delta -= 7; // prefer past weekday in speech
      if (/\bhoy\b/.test(lower)) delta = 0;
      dayOffset = delta;
      hints.push(`dia-semana:${name}`);
      break;
    }
  }

  if (!hasTime && !lugar && hints.length === 0) {
    return null;
  }

  const d = new Date(referenceDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);

  return buildResult(d, {
    source: "transcript",
    indefinido: false,
    confidence: hasTime || lugar ? 0.65 : 0.45,
    lugar,
    ambientContext,
    rawHints: hints,
  });
}

/**
 * Cascada determinista A → B → C → Fallback (reloj del juego).
 */
export async function resolveTemporalLineage(input: {
  filename: string;
  originalCreatedAt?: Date | string | null;
  transcript?: string | null;
  ambientDefault?: string;
}): Promise<TemporalLineageResult> {
  const fromName = extractLineageFromFilename(input.filename);
  if (fromName) {
    return {
      ...fromName,
      ambientContext: input.ambientDefault ?? fromName.ambientContext,
    };
  }

  const fromFs = extractLineageFromFilesystem(input.originalCreatedAt);
  if (fromFs) {
    // Si hay transcript, enriquecer lugar/contexto sin pisar el timestamp FS
    const fromText = input.transcript
      ? extractLineageFromTranscript(input.transcript, fromFs.timestampExacto)
      : null;
    return {
      ...fromFs,
      lugar: fromText?.lugar ?? fromFs.lugar,
      ambientContext:
        fromText?.ambientContext ??
        input.ambientDefault ??
        fromFs.ambientContext,
      rawHints: [
        ...fromFs.rawHints,
        ...(fromText?.rawHints ?? []),
      ],
    };
  }

  const fromText = input.transcript
    ? extractLineageFromTranscript(input.transcript)
    : null;
  if (fromText) {
    return {
      ...fromText,
      ambientContext: input.ambientDefault ?? fromText.ambientContext,
    };
  }

  const gameNow = await getCurrentGameTime();
  return buildResult(gameNow, {
    source: "game_clock",
    indefinido: true,
    confidence: 0.15,
    ambientContext: input.ambientDefault ?? "indefinido",
    lugar: null,
    rawHints: ["fallback:game_clock"],
  });
}
