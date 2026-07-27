/**
 * Matriz CRM 6×6 — persistida en KgNode.metadata.crm
 */

export const CRM_KEY = "crm" as const;

export type PersonaTipo = "fisica" | "juridica";
export type PresupuestoNivel = "bajo" | "medio" | "alto" | "inversor";
export type RolProyecto =
  | "responsable"
  | "colaborador"
  | "cliente"
  | "asesor"
  | "otro";
export type FrecuenciaInteraccion =
  | "diaria"
  | "semanal"
  | "mensual"
  | "latente";
export type NaturalezaVinculo =
  | "laboral"
  | "personal"
  | "estrategico"
  | "academico";
export type CanalPreferido = "presencial" | "audio" | "texto";
export type EstadoRelacion =
  | "prospecto"
  | "aliado"
  | "cliente"
  | "mentorizado";
export type ImpactoVibe = "sube" | "baja" | "neutro";
export type EstadoRegistro = "verificado" | "candidato";

export type PersonaCrmIdentity = {
  documento?: string;
  fechaNacimiento?: string;
  nacionalidad?: string;
  tipoPersona?: PersonaTipo;
  vinculoOperador?: string;
};

export type PersonaCrmContacto = {
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  linkedin?: string;
  x?: string;
  instagram?: string;
  aparicionesPublicas?: string;
  presupuesto?: PresupuestoNivel;
};

export type PersonaCrmProyectos = {
  rolProyecto?: RolProyecto;
  hardSkills?: string[];
  softSkills?: string[];
  frecuencia?: FrecuenciaInteraccion;
  capital?: number;
};

export type PersonaCrmRed = {
  empresas?: string;
  naturalezaVinculo?: NaturalezaVinculo;
  canalPreferido?: CanalPreferido;
  avales?: string;
  historialAsaltos?: string;
};

export type PersonaCrmOportunidades = {
  busca?: string;
  ofrece?: string;
  oportunidadActiva?: string;
  estadoRelacion?: EstadoRelacion;
  proximaAccion?: string;
  historialIntercambios?: string;
};

export type PersonaCrmTelemetria = {
  origenIngesta?: string;
  universoBabel?: string;
  etiquetas?: string[];
  notasTranscripciones?: string;
  impactoVibe?: ImpactoVibe;
  estadoRegistro?: EstadoRegistro;
};

export type PersonaCrmModules = {
  identity?: PersonaCrmIdentity;
  contacto?: PersonaCrmContacto;
  proyectos?: PersonaCrmProyectos;
  red?: PersonaCrmRed;
  oportunidades?: PersonaCrmOportunidades;
  telemetria?: PersonaCrmTelemetria;
};

const PERSONA_TIPOS = new Set<string>(["fisica", "juridica"]);
const PRESUPUESTOS = new Set<string>(["bajo", "medio", "alto", "inversor"]);
const ROLES = new Set<string>([
  "responsable",
  "colaborador",
  "cliente",
  "asesor",
  "otro",
]);
const FRECUENCIAS = new Set<string>([
  "diaria",
  "semanal",
  "mensual",
  "latente",
]);
const NATURALEZAS = new Set<string>([
  "laboral",
  "personal",
  "estrategico",
  "academico",
]);
const CANALES = new Set<string>(["presencial", "audio", "texto"]);
const ESTADOS_REL = new Set<string>([
  "prospecto",
  "aliado",
  "cliente",
  "mentorizado",
]);
const IMPACTOS = new Set<string>(["sube", "baja", "neutro"]);
const ESTADOS_REG = new Set<string>(["verificado", "candidato"]);

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const list = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  if (typeof value === "string") {
    const list = value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  return undefined;
}

function asEnum<T extends string>(
  value: unknown,
  allowed: Set<string>,
): T | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return allowed.has(trimmed) ? (trimmed as T) : undefined;
}

function asCapital(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.round(value);
    if (n >= 1 && n <= 12) return n;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 12) return n;
  }
  return undefined;
}

function parseIdentity(raw: Record<string, unknown>): PersonaCrmIdentity {
  return {
    documento: asTrimmedString(raw.documento),
    fechaNacimiento: asTrimmedString(raw.fechaNacimiento),
    nacionalidad: asTrimmedString(raw.nacionalidad),
    tipoPersona: asEnum<PersonaTipo>(raw.tipoPersona, PERSONA_TIPOS),
    vinculoOperador: asTrimmedString(raw.vinculoOperador),
  };
}

function parseContacto(raw: Record<string, unknown>): PersonaCrmContacto {
  return {
    telefono: asTrimmedString(raw.telefono),
    email: asTrimmedString(raw.email),
    sitioWeb: asTrimmedString(raw.sitioWeb),
    linkedin: asTrimmedString(raw.linkedin),
    x: asTrimmedString(raw.x),
    instagram: asTrimmedString(raw.instagram),
    aparicionesPublicas: asTrimmedString(raw.aparicionesPublicas),
    presupuesto: asEnum<PresupuestoNivel>(raw.presupuesto, PRESUPUESTOS),
  };
}

function parseProyectos(raw: Record<string, unknown>): PersonaCrmProyectos {
  return {
    rolProyecto: asEnum<RolProyecto>(raw.rolProyecto, ROLES),
    hardSkills: asStringList(raw.hardSkills),
    softSkills: asStringList(raw.softSkills),
    frecuencia: asEnum<FrecuenciaInteraccion>(raw.frecuencia, FRECUENCIAS),
    capital: asCapital(raw.capital),
  };
}

function parseRed(raw: Record<string, unknown>): PersonaCrmRed {
  return {
    empresas: asTrimmedString(raw.empresas),
    naturalezaVinculo: asEnum<NaturalezaVinculo>(
      raw.naturalezaVinculo,
      NATURALEZAS,
    ),
    canalPreferido: asEnum<CanalPreferido>(raw.canalPreferido, CANALES),
    avales: asTrimmedString(raw.avales),
    historialAsaltos: asTrimmedString(raw.historialAsaltos),
  };
}

function parseOportunidades(
  raw: Record<string, unknown>,
): PersonaCrmOportunidades {
  return {
    busca: asTrimmedString(raw.busca),
    ofrece: asTrimmedString(raw.ofrece),
    oportunidadActiva: asTrimmedString(raw.oportunidadActiva),
    estadoRelacion: asEnum<EstadoRelacion>(raw.estadoRelacion, ESTADOS_REL),
    proximaAccion: asTrimmedString(raw.proximaAccion),
    historialIntercambios: asTrimmedString(raw.historialIntercambios),
  };
}

function parseTelemetria(raw: Record<string, unknown>): PersonaCrmTelemetria {
  return {
    origenIngesta: asTrimmedString(raw.origenIngesta),
    universoBabel: asTrimmedString(raw.universoBabel),
    etiquetas: asStringList(raw.etiquetas),
    notasTranscripciones: asTrimmedString(raw.notasTranscripciones),
    impactoVibe: asEnum<ImpactoVibe>(raw.impactoVibe, IMPACTOS),
    estadoRegistro: asEnum<EstadoRegistro>(raw.estadoRegistro, ESTADOS_REG),
  };
}

function compactObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    result[key] = value;
  }
  return result as Partial<T>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Parsea metadata.crm desde JSON crudo. */
export function parsePersonaCrm(raw: unknown): PersonaCrmModules {
  if (!isRecord(raw)) return {};

  return {
    identity: isRecord(raw.identity)
      ? compactObject(parseIdentity(raw.identity))
      : undefined,
    contacto: isRecord(raw.contacto)
      ? compactObject(parseContacto(raw.contacto))
      : undefined,
    proyectos: isRecord(raw.proyectos)
      ? compactObject(parseProyectos(raw.proyectos))
      : undefined,
    red: isRecord(raw.red) ? compactObject(parseRed(raw.red)) : undefined,
    oportunidades: isRecord(raw.oportunidades)
      ? compactObject(parseOportunidades(raw.oportunidades))
      : undefined,
    telemetria: isRecord(raw.telemetria)
      ? compactObject(parseTelemetria(raw.telemetria))
      : undefined,
  };
}

/** Extrae crm tipado desde metadata de KgNode. */
export function extractCrmFromMetadata(
  metadata: Record<string, unknown>,
): PersonaCrmModules {
  return parsePersonaCrm(metadata[CRM_KEY]);
}

/** Normaliza un payload parcial CRM (sanitiza enums/listas). */
export function normalizePersonaCrm(
  input: PersonaCrmModules | null | undefined,
): PersonaCrmModules {
  if (!input) return {};
  return parsePersonaCrm(input);
}

function mergeModule<T extends Record<string, unknown>>(
  base: T | undefined,
  patch: T | undefined,
): T | undefined {
  if (!patch) return base;
  const merged = compactObject({
    ...(base ?? {}),
    ...patch,
  }) as T;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Merge profundo de módulos CRM (patch gana por key). */
export function mergePersonaCrm(
  existing: PersonaCrmModules | undefined,
  patch: PersonaCrmModules | undefined,
): PersonaCrmModules {
  const base = normalizePersonaCrm(existing);
  const next = normalizePersonaCrm(patch);

  return compactObject({
    identity: mergeModule(base.identity, next.identity),
    contacto: mergeModule(base.contacto, next.contacto),
    proyectos: mergeModule(base.proyectos, next.proyectos),
    red: mergeModule(base.red, next.red),
    oportunidades: mergeModule(base.oportunidades, next.oportunidades),
    telemetria: mergeModule(base.telemetria, next.telemetria),
  }) as PersonaCrmModules;
}

/** Serializa CRM limpio para persistir en metadata. */
export function serializePersonaCrm(
  crm: PersonaCrmModules | undefined,
): Record<string, unknown> | undefined {
  const normalized = normalizePersonaCrm(crm);
  const identity = normalized.identity
    ? compactObject(normalized.identity)
    : undefined;
  const contacto = normalized.contacto
    ? compactObject(normalized.contacto)
    : undefined;
  const proyectos = normalized.proyectos
    ? compactObject(normalized.proyectos)
    : undefined;
  const red = normalized.red ? compactObject(normalized.red) : undefined;
  const oportunidades = normalized.oportunidades
    ? compactObject(normalized.oportunidades)
    : undefined;
  const telemetria = normalized.telemetria
    ? compactObject(normalized.telemetria)
    : undefined;

  const packed = compactObject({
    identity: identity && Object.keys(identity).length ? identity : undefined,
    contacto: contacto && Object.keys(contacto).length ? contacto : undefined,
    proyectos:
      proyectos && Object.keys(proyectos).length ? proyectos : undefined,
    red: red && Object.keys(red).length ? red : undefined,
    oportunidades:
      oportunidades && Object.keys(oportunidades).length
        ? oportunidades
        : undefined,
    telemetria:
      telemetria && Object.keys(telemetria).length ? telemetria : undefined,
  });

  return Object.keys(packed).length > 0 ? packed : undefined;
}

/** Convierte texto multilinea / coma-separado a lista de skills/tags. */
export function linesToList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listToLines(value: string[] | undefined): string {
  return value?.length ? value.join("\n") : "";
}
