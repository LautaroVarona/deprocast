import "server-only";

import { getYo } from "@/lib/yo/store";

/**
 * Reloj del juego / operador: mago12 del Yo + instante del sistema.
 * Usado como fallback de linaje temporal (Capa Fallback).
 */
export async function getCurrentGameTime(): Promise<Date> {
  try {
    const yo = await getYo();
    const now = new Date();
    // Ancla simbólica: mago12 como "hora hermética" 1–12 → 8–19h local
    const hourHint = 7 + Math.min(12, Math.max(1, yo.mago12));
    const anchored = new Date(now);
    if (
      Number.isNaN(anchored.getHours()) ||
      Math.abs(anchored.getHours() - hourHint) > 6
    ) {
      // Solo ajusta si el reloj del operador está lejos; preferimos now real.
      return now;
    }
    return now;
  } catch {
    return new Date();
  }
}
