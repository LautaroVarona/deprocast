/**
 * Catálogo stub de los 72 Poderes.
 * IDs fijos P01–P72; los nombres se rellenan cuando se decodifiquen.
 */

export type PowerId = `P${string}`;

export type PowerDef = {
  id: PowerId;
  name: string;
};

function padPowerIndex(n: number): string {
  return String(n).padStart(2, "0");
}

export const POWERS_72: readonly PowerDef[] = Object.freeze(
  Array.from({ length: 72 }, (_, i) => {
    const n = i + 1;
    const id = `P${padPowerIndex(n)}` as PowerId;
    return { id, name: `Poder ${padPowerIndex(n)}` };
  }),
);

const POWER_ID_SET = new Set(POWERS_72.map((p) => p.id));

export function isPowerId(value: string): value is PowerId {
  return POWER_ID_SET.has(value as PowerId);
}

export function getPowerDef(id: string): PowerDef | null {
  if (!isPowerId(id)) return null;
  return POWERS_72.find((p) => p.id === id) ?? null;
}
