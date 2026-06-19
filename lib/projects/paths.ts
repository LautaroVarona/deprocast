import { getCampoLabel, getCampoSlugFromLabel, type CampoSlug } from "@/lib/projects/campos";
import { getDataPath } from "@/lib/runtime-paths";
import path from "node:path";

export const PROJECTS_ROOT_DIR = getDataPath("projects");

export { getCampoLabel, getCampoSlugFromLabel };

export function getProjectDir(campoSlug: CampoSlug): string {
  return path.join(PROJECTS_ROOT_DIR, campoSlug);
}

export function getProjectFilePath(campoSlug: CampoSlug, projectId: string): string {
  return path.join(getProjectDir(campoSlug), `${projectId}.md`);
}
