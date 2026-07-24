import { BROWSER_PREFERENCE_KEYS } from "@/lib/backup/domains";

export function collectBrowserPreferences(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return {};
  }

  const preferences: Record<string, unknown> = {};

  for (const key of BROWSER_PREFERENCE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      continue;
    }

    try {
      preferences[key] = JSON.parse(raw) as unknown;
    } catch {
      preferences[key] = raw;
    }
  }

  return preferences;
}

export function applyBrowserPreferences(
  preferences: Record<string, unknown> | null | undefined,
): void {
  if (typeof window === "undefined" || !preferences) {
    return;
  }

  for (const [key, value] of Object.entries(preferences)) {
    if (!BROWSER_PREFERENCE_KEYS.includes(key as (typeof BROWSER_PREFERENCE_KEYS)[number])) {
      continue;
    }

    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  }
}

/** Borra preferencias de navegador asociadas a Deprocast (post-wipe). */
export function clearBrowserPreferences(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of BROWSER_PREFERENCE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDomainStat(fileCount: number, totalBytes: number, rowCount: number, clientOnly: boolean): string {
  if (clientOnly) {
    return "Solo en este navegador";
  }

  const parts: string[] = [];
  if (rowCount > 0) {
    parts.push(`${rowCount} filas`);
  }
  if (fileCount > 0) {
    parts.push(`${fileCount} archivos`);
  }
  if (totalBytes > 0) {
    parts.push(formatBytes(totalBytes));
  }

  return parts.length > 0 ? parts.join(" · ") : "Sin datos";
}
