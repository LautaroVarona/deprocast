export const INCOME_CATEGORIES = [
  "sueldo",
  "inversiones",
  "pasivos",
  "ventas",
] as const;

export const EXPENSE_TIERS = [
  "necesarios",
  "primarios",
  "secundarios",
  "terciarios",
] as const;

export const TRANSACTION_TYPES = ["ingreso", "egreso"] as const;

export const TRANSACTION_STATUSES = ["pending", "confirmed", "rejected"] as const;

export const SOURCE_CHANNELS = ["text", "audio", "image", "manual"] as const;

export const SUGGESTED_PROJECTS = [
  "Deprocast",
  "Studianta",
  "Versa",
  "Personal",
] as const;

export const INCOME_CATEGORY_LABELS: Record<
  (typeof INCOME_CATEGORIES)[number],
  string
> = {
  sueldo: "Sueldo (nómina fija)",
  inversiones: "Inversiones",
  pasivos: "Ingresos pasivos",
  ventas: "Ventas / Consultoría",
};

export const EXPENSE_TIER_LABELS: Record<(typeof EXPENSE_TIERS)[number], string> = {
  necesarios: "Necesarios",
  primarios: "Primarios",
  secundarios: "Secundarios",
  terciarios: "Terciarios / SaaS",
};

export const FINANCIAL_CAPITAL_ID = "operator";
