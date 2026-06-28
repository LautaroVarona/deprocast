export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function clampFocus(value: number): number {
  return Math.min(12, Math.max(1, Math.round(value)));
}

export function createNoteId(): string {
  return `crw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSessionId(): string {
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isAcceptedVideoFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  const hasVideoMime = file.type.startsWith("video/");
  const hasExtension = [".mp4", ".m4v", ".mov", ".webm", ".mkv"].some((ext) =>
    lower.endsWith(ext),
  );
  return hasVideoMime || hasExtension;
}

export function formatNoteLine(note: {
  timestamp: string;
  appActiva: string;
  descripcionDetallada: string;
  nivelDeFoco: number;
}): string {
  return `[${note.timestamp}] [${note.appActiva}] (foco:${note.nivelDeFoco}) ${note.descripcionDetallada}`;
}
