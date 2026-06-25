import { getDataPath } from "@/lib/runtime-paths";

export const NOTAS_DIR = getDataPath("tacho", "notas");

export function notebookDir(notebookId: string): string {
  return getDataPath("tacho", "notas", notebookId);
}

export function pageImageUrl(imagePath: string): string {
  const normalized = imagePath.replace(/^data[\\/]/, "").replace(/\\/g, "/");
  return `/api/cuadernos/media/${normalized}`;
}
