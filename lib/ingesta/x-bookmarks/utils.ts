import type { XBookmarkRecord } from "./types";

/** Fisher-Yates: orden aleatorio estable por sesión de calibración. */
export function shuffleBookmarks<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function formatBookmarkDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function bookmarkDateLabel(bookmark: Pick<XBookmarkRecord, "bookmarkedAt">): string | null {
  return formatBookmarkDate(bookmark.bookmarkedAt);
}

export function vibeWeightTone(weight: number): {
  label: string;
  className: string;
} {
  if (weight <= 3) {
    return { label: "bajo", className: "text-white/45" };
  }
  if (weight <= 6) {
    return { label: "medio", className: "text-amber-200/80" };
  }
  if (weight <= 9) {
    return { label: "alto", className: "text-emerald-200/90" };
  }
  return { label: "oro", className: "text-white" };
}
