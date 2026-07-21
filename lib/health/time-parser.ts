import "server-only";

function setTime(date: Date, hours: number, minutes = 0): Date {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function resolveOccurredAtFromNaturalText(
  text: string,
  fallback = new Date(),
): Date {
  const base = new Date(fallback);
  if (!text.trim()) return base;
  const lower = text.toLowerCase();

  if (lower.includes("ayer") || lower.includes("anoche")) {
    base.setDate(base.getDate() - 1);
  }

  if (lower.includes("hoy a la mañana")) return setTime(base, 9);
  if (lower.includes("hoy al mediodia") || lower.includes("hoy al mediodía")) {
    return setTime(base, 13);
  }
  if (lower.includes("hoy a la tarde")) return setTime(base, 18);
  if (lower.includes("hoy a la noche") || lower.includes("anoche")) {
    return setTime(base, 21);
  }

  const explicitTime = lower.match(/(?:a\s+las\s+)?(\d{1,2})(?::|\.)(\d{2})\s*(?:hs|h)?/);
  if (explicitTime) {
    const hours = Number(explicitTime[1]);
    const minutes = Number(explicitTime[2]);
    if (
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      return setTime(base, hours, minutes);
    }
  }

  return base;
}
