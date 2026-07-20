import { getDataPath } from "@/lib/runtime-paths";

export function getMemoryRoot(): string {
  return getDataPath("memory");
}

export function getMemoryIndexPath(): string {
  return getDataPath("memory", "INDEX.md");
}

export function getSessionsDir(): string {
  return getDataPath("memory", "sessions");
}

export function getSessionMarkdownPath(sessionId: string): string {
  return getDataPath("memory", "sessions", `${sessionId}.md`);
}

export function getTranslatorsDir(): string {
  return getDataPath("memory", "knowledge", "translators");
}

export function getTranslatorsIndexPath(): string {
  return getDataPath("memory", "knowledge", "translators", "INDEX.md");
}
