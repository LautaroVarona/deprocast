/**
 * Atribución de origen estricta (grimorio): canal + actores tipados.
 * Todo texto, audio, cuaderno o marcador social debe portar OriginAttribution.
 */

export const ORIGIN_CHANNELS = [
  "texto",
  "audio",
  "cuadernos",
  "social",
] as const;

export type OriginChannel = (typeof ORIGIN_CHANNELS)[number];

export const ORIGIN_ACTOR_KINDS = [
  "self",
  "person",
  "org",
  "ai_agent",
  "speaker",
] as const;

export type OriginActorKind = (typeof ORIGIN_ACTOR_KINDS)[number];

export type OriginActor = {
  kind: OriginActorKind;
  id?: string;
  label: string;
};

export type OriginAttribution = {
  channel: OriginChannel;
  actors: OriginActor[];
  capturedAt: string;
  meta?: Record<string, unknown>;
};

export function isOriginChannel(value: unknown): value is OriginChannel {
  return (
    typeof value === "string" &&
    (ORIGIN_CHANNELS as readonly string[]).includes(value)
  );
}

export function isOriginActorKind(value: unknown): value is OriginActorKind {
  return (
    typeof value === "string" &&
    (ORIGIN_ACTOR_KINDS as readonly string[]).includes(value)
  );
}

export function buildOriginAttribution(input: {
  channel: OriginChannel;
  actors: OriginActor[];
  capturedAt?: string;
  meta?: Record<string, unknown>;
}): OriginAttribution {
  const actors = input.actors
    .map((actor) => ({
      kind: actor.kind,
      id: actor.id?.trim() || undefined,
      label: actor.label.trim(),
    }))
    .filter((actor) => actor.label.length > 0);

  return {
    channel: input.channel,
    actors,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    ...(input.meta ? { meta: input.meta } : {}),
  };
}

export function assertOriginAttribution(
  value: unknown,
): asserts value is OriginAttribution {
  if (!value || typeof value !== "object") {
    throw new Error("OriginAttribution ausente: se requiere un objeto de origen.");
  }

  const record = value as Record<string, unknown>;

  if (!isOriginChannel(record.channel)) {
    throw new Error(
      `OriginAttribution inválida: canal debe ser uno de ${ORIGIN_CHANNELS.join(", ")}.`,
    );
  }

  if (!Array.isArray(record.actors) || record.actors.length === 0) {
    throw new Error(
      "OriginAttribution inválida: se requiere al menos un actor tipado.",
    );
  }

  for (const actor of record.actors) {
    if (!actor || typeof actor !== "object") {
      throw new Error("OriginAttribution inválida: actor mal formado.");
    }
    const a = actor as Record<string, unknown>;
    if (!isOriginActorKind(a.kind)) {
      throw new Error(
        `OriginAttribution inválida: kind de actor debe ser uno de ${ORIGIN_ACTOR_KINDS.join(", ")}.`,
      );
    }
    if (typeof a.label !== "string" || !a.label.trim()) {
      throw new Error("OriginAttribution inválida: cada actor necesita label.");
    }
  }

  if (typeof record.capturedAt !== "string" || !record.capturedAt.trim()) {
    throw new Error("OriginAttribution inválida: falta capturedAt.");
  }
}

/** Mapea canales de ingesta purifier a canales de origen del grimorio. */
export function mapIngestaChannelToOrigin(
  channel: string,
): OriginChannel | null {
  switch (channel) {
    case "texto":
      return "texto";
    case "audio":
      return "audio";
    case "cuadernos":
    case "vision":
      return "cuadernos";
    case "x-bookmarks":
    case "social":
      return "social";
    case "tablas":
      return "texto";
    default:
      return null;
  }
}

export function selfActor(label = "self"): OriginActor {
  return { kind: "self", label };
}

export function personActor(label: string, id?: string): OriginActor {
  return { kind: "person", label, ...(id ? { id } : {}) };
}

export function aiAgentActor(label: string, id?: string): OriginActor {
  return { kind: "ai_agent", label, ...(id ? { id } : {}) };
}

export function speakerActor(label: string, id?: string): OriginActor {
  return { kind: "speaker", label, ...(id ? { id } : {}) };
}

export function originToJson(
  origin: OriginAttribution,
): Record<string, unknown> {
  return {
    channel: origin.channel,
    actors: origin.actors,
    capturedAt: origin.capturedAt,
    ...(origin.meta ? { meta: origin.meta } : {}),
  };
}

const DIA_SEMANA_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Deduce el día de la semana en español desde una fecha de captura. */
export function computeDiaSemana(date: Date): string {
  return DIA_SEMANA_ES[date.getDay()] ?? "Lunes";
}

export function parseOriginFromBody(
  value: unknown,
): OriginAttribution | undefined {
  if (!value || typeof value !== "object") return undefined;

  try {
    const candidate = value as OriginAttribution;
    assertOriginAttribution(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}
