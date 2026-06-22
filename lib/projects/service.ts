import {
  DEFAULT_CAMPO_SLUG,
  getCampoLabel,
  getDefaultCampo,
  isCampoSlug,
  type CampoInfo,
} from "@/lib/projects/campos";
import {
  appendProgressToMarkdown,
  buildInitialProgressEntry,
  buildProjectMarkdown,
  createProjectFromInput,
  parseProjectFile,
} from "@/lib/projects/markdown";
import {
  getProjectDir,
  getProjectFilePath,
  PROJECTS_ROOT_DIR,
} from "@/lib/projects/paths";
import type {
  AddProgressInput,
  CreateProjectInput,
  Project,
} from "@/lib/projects/types";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function readProjectsFromDir(dir: string): Promise<Project[]> {
  const projects: Project[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const filePath = path.join(dir, entry.name);
      const content = await readFile(filePath, "utf8");
      const project = parseProjectFile(filePath, content);
      if (project) projects.push(project);
    }
  } catch {
    return projects;
  }

  return projects;
}

export async function listProjects(): Promise<Project[]> {
  await mkdir(PROJECTS_ROOT_DIR, { recursive: true });

  const projects: Project[] = [];
  const entries = await readdir(PROJECTS_ROOT_DIR, { withFileTypes: true }).catch(
    () => [],
  );

  for (const entry of entries) {
    if (!entry.isDirectory() || !isCampoSlug(entry.name)) continue;

    const dir = path.join(PROJECTS_ROOT_DIR, entry.name);
    projects.push(...(await readProjectsFromDir(dir)));
  }

  return projects.sort((a, b) => {
    const priorityDiff = Math.max(b.prioridad, b.impacto) - Math.max(a.prioridad, a.impacto);
    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title, "es");
  });
}

export async function listCampos(): Promise<CampoInfo[]> {
  await mkdir(PROJECTS_ROOT_DIR, { recursive: true });

  const projects = await listProjects();
  const counts = new Map<string, number>();

  for (const project of projects) {
    counts.set(project.campoSlug, (counts.get(project.campoSlug) ?? 0) + 1);
  }

  const entries = await readdir(PROJECTS_ROOT_DIR, { withFileTypes: true }).catch(
    () => [],
  );

  const slugs = new Set<string>([DEFAULT_CAMPO_SLUG]);
  for (const entry of entries) {
    if (entry.isDirectory() && isCampoSlug(entry.name)) {
      slugs.add(entry.name);
    }
  }

  if (slugs.size === 0) {
    return [getDefaultCampo()];
  }

  const campos = [...slugs]
    .sort((a, b) => {
      if (a === DEFAULT_CAMPO_SLUG) return -1;
      if (b === DEFAULT_CAMPO_SLUG) return 1;
      return getCampoLabel(a).localeCompare(getCampoLabel(b), "es");
    })
    .map((slug) => ({
      slug,
      label: getCampoLabel(slug),
      count: counts.get(slug) ?? 0,
    }));

  return campos;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (!input.title.trim()) {
    throw new Error("El título del proyecto es obligatorio.");
  }

  const id = randomUUID();
  const projectData = createProjectFromInput(input, id);
  const filePath = getProjectFilePath(input.campoSlug, id);

  await mkdir(getProjectDir(input.campoSlug), { recursive: true });
  await writeFile(filePath, buildProjectMarkdown(projectData), "utf8");

  return {
    ...projectData,
    filename: path.basename(filePath),
    filePath,
  };
}

export async function findProjectById(projectId: string): Promise<Project | null> {
  const projects = await listProjects();
  return projects.find((project) => project.id === projectId) ?? null;
}

export async function addProgressEntry(input: AddProgressInput): Promise<Project> {
  const project = await findProjectById(input.projectId);
  if (!project) {
    throw new Error("Proyecto no encontrado en el Atanor local.");
  }

  const nota = input.nota.trim();
  if (!nota) {
    throw new Error("La nota de progreso no puede estar vacía.");
  }

  const entry = buildInitialProgressEntry(
    nota,
    input.fecha ? new Date(input.fecha) : new Date(),
  );
  const content = await readFile(project.filePath, "utf8");
  const updatedContent = appendProgressToMarkdown(content, entry);
  await writeFile(project.filePath, updatedContent, "utf8");

  const updated = parseProjectFile(project.filePath, updatedContent);
  if (!updated) {
    throw new Error("No se pudo actualizar la bitácora del proyecto.");
  }

  return updated;
}

export async function countProjectFiles(): Promise<number> {
  const projects = await listProjects();
  return projects.length;
}
