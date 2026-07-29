import "server-only";

import { prefersSqliteProjectStore } from "@/lib/runtime-paths";
import type { Project, ProjectStatus, ProjectTipo } from "@/lib/projects/types";
import { getProjectFilePath } from "@/lib/projects/paths";
import { prisma } from "@/lib/prisma";

function rowToProject(row: {
  id: string;
  campoSlug: string;
  title: string;
  payload: unknown;
}): Project | null {
  let payload: Record<string, unknown>;
  if (typeof row.payload === "string") {
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)) {
    payload = row.payload as Record<string, unknown>;
  } else {
    return null;
  }

  const filePath =
    typeof payload.filePath === "string"
      ? payload.filePath
      : getProjectFilePath(row.campoSlug, row.id);

  return {
    ...(payload as unknown as Project),
    id: row.id,
    title: row.title || String(payload.title ?? ""),
    campoSlug: row.campoSlug,
    filename:
      typeof payload.filename === "string"
        ? payload.filename
        : `${row.id}.md`,
    filePath,
  };
}

export async function upsertAtanorProjectRow(project: Project): Promise<void> {
  const now = new Date().toISOString();
  const payload = JSON.stringify(project);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "AtanorProject" ("id", "campoSlug", "title", "payload", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT("id") DO UPDATE SET
       "campoSlug" = excluded."campoSlug",
       "title" = excluded."title",
       "payload" = excluded."payload",
       "updatedAt" = excluded."updatedAt"`,
    project.id,
    project.campoSlug,
    project.title,
    payload,
    now,
    now,
  );
}

export async function listAtanorProjectsFromDb(): Promise<Project[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; campoSlug: string; title: string; payload: unknown }>
    >(`SELECT "id", "campoSlug", "title", "payload" FROM "AtanorProject" ORDER BY "updatedAt" DESC`);
    const projects: Project[] = [];
    for (const row of rows) {
      const project = rowToProject(row);
      if (project) projects.push(project);
    }
    return projects;
  } catch (error) {
    console.warn("[atanor] listAtanorProjectsFromDb skipped:", error);
    return [];
  }
}

export async function findAtanorProjectInDb(
  projectId: string,
): Promise<Project | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; campoSlug: string; title: string; payload: unknown }>
    >(
      `SELECT "id", "campoSlug", "title", "payload" FROM "AtanorProject" WHERE "id" = ? LIMIT 1`,
      projectId,
    );
    const row = rows[0];
    return row ? rowToProject(row) : null;
  } catch {
    return null;
  }
}

/** Merge filesystem + SQLite; en Vercel la DB gana si hay colisión. */
export function mergeProjectSources(
  fileProjects: Project[],
  dbProjects: Project[],
): Project[] {
  const byId = new Map<string, Project>();

  if (prefersSqliteProjectStore()) {
    for (const project of fileProjects) byId.set(project.id, project);
    for (const project of dbProjects) byId.set(project.id, project);
  } else {
    for (const project of dbProjects) byId.set(project.id, project);
    for (const project of fileProjects) byId.set(project.id, project);
  }

  return [...byId.values()].sort((a, b) => {
    const priorityDiff =
      Math.max(b.prioridad, b.impacto) - Math.max(a.prioridad, a.impacto);
    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title, "es");
  });
}

export async function applyClientProjectSnapshots(
  projects: Array<Partial<Project> & { id: string; title: string; campoSlug: string }>,
): Promise<number> {
  let applied = 0;
  for (const item of projects.slice(0, 40)) {
    if (!item.id?.trim() || !item.title?.trim() || !item.campoSlug?.trim()) {
      continue;
    }
    const existing = await findAtanorProjectInDb(item.id);
    if (existing) continue;

    const project: Project = {
      id: item.id,
      title: item.title,
      tipo: (item.tipo as ProjectTipo | null) ?? null,
      campo: item.campo ?? item.campoSlug,
      campoSlug: item.campoSlug,
      metaTagsSecundarios: item.metaTagsSecundarios ?? [],
      description: item.description ?? "",
      responsable: item.responsable ?? "",
      subpersonasCargo: item.subpersonasCargo ?? [],
      fechaInicio: item.fechaInicio ?? "",
      fechaObjetivo: item.fechaObjetivo ?? "",
      prioridad: typeof item.prioridad === "number" ? item.prioridad : 6,
      impacto: typeof item.impacto === "number" ? item.impacto : 6,
      dificultad: typeof item.dificultad === "number" ? item.dificultad : 6,
      horasEstimadas: item.horasEstimadas ?? 0,
      horasRealizadas: item.horasRealizadas ?? 0,
      avancePorcentaje: item.avancePorcentaje ?? 0,
      estado: (item.estado as ProjectStatus) ?? "Idea",
      resultadoFinal: item.resultadoFinal ?? "",
      progressEntries: item.progressEntries ?? [],
      filename: item.filename ?? `${item.id}.md`,
      filePath:
        item.filePath ?? getProjectFilePath(item.campoSlug, item.id),
    };

    await upsertAtanorProjectRow(project);
    applied += 1;
  }
  return applied;
}
