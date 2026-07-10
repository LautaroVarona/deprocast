import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { readCampoMeta, resolveCampoLabel, writeCampoMeta } from "@/lib/projects/campo-meta";
import {
  DEFAULT_CAMPO_SLUG,
  extractLinkedCampoSlugs,
  getCampoLabel,
  getDefaultCampo,
  isCampoSlug,
  slugifyCampoInput,
  type Campo,
  type CampoInfo,
  type CampoSlug,
  type CreateCampoInput,
  type UpdateCampoInput,
} from "@/lib/projects/campos";
import {
  appendProgressToMarkdown,
  buildInitialProgressEntry,
  buildProjectMarkdown,
  createProjectFromInput,
  parseProjectFile,
  updateCampoInMarkdown,
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
import { access, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
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

export async function ensureCampoExists(slug: CampoSlug): Promise<void> {
  if (!isCampoSlug(slug)) return;

  await mkdir(getProjectDir(slug), { recursive: true });
  const existing = await readCampoMeta(slug);
  if (existing) return;

  await writeCampoMeta({
    slug,
    label: getCampoLabel(slug),
    description: "",
    createdAt: new Date().toISOString().slice(0, 10),
    universeSlug: slug === DEFAULT_CAMPO_SLUG ? ROOT_UNIVERSE_SLUG : undefined,
  });
}

export async function listCampos(universeSlug?: string): Promise<CampoInfo[]> {
  await mkdir(PROJECTS_ROOT_DIR, { recursive: true });

  const projects = await listProjects();
  const counts = new Map<string, number>();

  for (const project of projects) {
    for (const slug of extractLinkedCampoSlugs(project)) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
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

  const campos = await Promise.all(
    [...slugs]
      .sort((a, b) => {
        if (a === DEFAULT_CAMPO_SLUG) return -1;
        if (b === DEFAULT_CAMPO_SLUG) return 1;
        return getCampoLabel(a).localeCompare(getCampoLabel(b), "es");
      })
      .map(async (slug) => {
        const meta = await readCampoMeta(slug);
        const campoUniverse = meta?.universeSlug ?? ROOT_UNIVERSE_SLUG;
        if (universeSlug && campoUniverse !== universeSlug) {
          return null;
        }
        return {
          slug,
          label: meta?.label ?? getCampoLabel(slug),
          description: meta?.description,
          count: counts.get(slug) ?? 0,
        };
      }),
  );

  return campos.filter((campo): campo is CampoInfo => campo !== null);
}

export async function getCampo(slug: string): Promise<Campo | null> {
  if (!isCampoSlug(slug)) return null;

  const campos = await listCampos();
  const info = campos.find((campo) => campo.slug === slug);
  if (!info) return null;

  const projects = (await listProjects()).filter((project) =>
    extractLinkedCampoSlugs(project).includes(slug),
  );
  const meta = await readCampoMeta(slug);

  return {
    ...info,
    description: meta?.description ?? info.description ?? "",
    createdAt: meta?.createdAt ?? "",
    projectIds: projects.map((project) => project.id),
  };
}

export async function createCampo(input: CreateCampoInput): Promise<Campo> {
  const label = input.label.trim();
  if (!label) {
    throw new Error("El nombre del Campo es obligatorio.");
  }

  const slug = slugifyCampoInput(label);
  if (!isCampoSlug(slug)) {
    throw new Error("El nombre del Campo no genera un slug válido.");
  }

  const existing = await readCampoMeta(slug);
  const dirExists = await access(getProjectDir(slug))
    .then(() => true)
    .catch(() => false);
  if (existing || dirExists) {
    throw new Error("Ya existe un Campo con ese identificador.");
  }

  await mkdir(getProjectDir(slug), { recursive: true });
  const meta = {
    slug,
    label,
    description: input.description?.trim() ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
    universeSlug: input.universeSlug ?? ROOT_UNIVERSE_SLUG,
  };
  await writeCampoMeta(meta);

  return {
    slug,
    label,
    description: meta.description,
    createdAt: meta.createdAt,
    count: 0,
    projectIds: [],
  };
}

export async function updateCampo(slug: string, input: UpdateCampoInput): Promise<Campo> {
  if (!isCampoSlug(slug)) {
    throw new Error("Slug de Campo inválido.");
  }

  const current = await getCampo(slug);
  if (!current) {
    throw new Error("Campo no encontrado.");
  }

  const label = input.label?.trim() || current.label;
  const description =
    input.description !== undefined ? input.description.trim() : current.description;

  const meta = {
    slug,
    label,
    description,
    createdAt: current.createdAt || new Date().toISOString().slice(0, 10),
  };
  await writeCampoMeta(meta);

  if (label !== current.label) {
    const dir = getProjectDir(slug);
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filePath = path.join(dir, entry.name);
      const content = await readFile(filePath, "utf8");
      await writeFile(filePath, updateCampoInMarkdown(content, label), "utf8");
    }
  }

  return (await getCampo(slug))!;
}

export async function assignProjectToCampo(
  projectId: string,
  campoSlug: CampoSlug,
): Promise<Project> {
  if (!isCampoSlug(campoSlug)) {
    throw new Error("Seleccioná un Campo válido.");
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error("Proyecto no encontrado en el Atanor local.");
  }

  if (project.campoSlug === campoSlug) {
    return project;
  }

  const campoLabel = await resolveCampoLabel(campoSlug);
  const content = await readFile(project.filePath, "utf8");
  const updatedContent = updateCampoInMarkdown(content, campoLabel);
  const newPath = getProjectFilePath(campoSlug, project.id);

  await ensureCampoExists(campoSlug);
  await writeFile(newPath, updatedContent, "utf8");
  await unlink(project.filePath).catch(() => {});

  const updated = parseProjectFile(newPath, updatedContent);
  if (!updated) {
    throw new Error("No se pudo reasignar el proyecto al Campo.");
  }

  return updated;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (!input.title.trim()) {
    throw new Error("El título del proyecto es obligatorio.");
  }

  const id = randomUUID();
  const campoLabel = await resolveCampoLabel(input.campoSlug);
  const projectData = createProjectFromInput(input, id, campoLabel);
  const filePath = getProjectFilePath(input.campoSlug, id);

  await ensureCampoExists(input.campoSlug);
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
