import "server-only";

import { CORE_ARCANA_22 } from "@/lib/mago/constants";
import { getTradicionForArcana } from "@/lib/mago/tradition";
import { listMagoColecciones, listMagoColeccionesWithItems } from "@/lib/mago/store";
import type {
  MagoColeccionKind,
  MagoMatrixResponse,
  PaginaMago22,
} from "@/lib/mago/types";
import {
  buildCalibrationProject,
  resolveProjectLastActivity,
} from "@/lib/ludus/project-activity";
import type { LudusProjectStatus } from "@/lib/ludus/types";
import { listProjects } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";

function fogToFriccion(fogLevel: "none" | "light" | "heavy"): number {
  if (fogLevel === "heavy") return 2;
  if (fogLevel === "light") return 1;
  return 0;
}

export async function buildPaginasMago22(): Promise<PaginaMago22[]> {
  const [colecciones, projects, registryRows] = await Promise.all([
    listMagoColeccionesWithItems(),
    listProjects(),
    prisma.ludusProjectRegistry.findMany(),
  ]);

  const registry = new Map(
    registryRows.map((row) => [row.projectId, row.status as LudusProjectStatus]),
  );
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const projectIdsNeeded = new Set<string>();
  for (const col of colecciones) {
    for (const item of col.items) {
      if (item.refKind === "project" && item.refId) {
        projectIdsNeeded.add(item.refId);
      }
    }
  }

  const calibrationByProjectId = new Map<
    string,
    ReturnType<typeof buildCalibrationProject>
  >();

  await Promise.all(
    [...projectIdsNeeded].map(async (projectId) => {
      const project = projectMap.get(projectId);
      if (!project) return;
      const lastActivityAt = await resolveProjectLastActivity(project);
      const status = registry.get(projectId) ?? "active";
      calibrationByProjectId.set(
        projectId,
        buildCalibrationProject(project, status, lastActivityAt),
      );
    }),
  );

  return CORE_ARCANA_22.map((core) => {
    const page: PaginaMago22 = {
      id: core.id,
      core,
      tradicion: getTradicionForArcana(core.id, core.tipo),
      otrasDimensiones: [],
    };

    for (const col of colecciones) {
      const kind = col.kind as MagoColeccionKind;
      const item = col.items.find((entry) => entry.slot === core.id);
      if (!item) continue;

      const titulo = item.titulo.trim();
      const hasContent = titulo.length > 0 || item.contenido.trim().length > 0;

      if (kind === "libro_rojo" && hasContent) {
        page.libroRojo = {
          titulo: titulo || `Página ${core.id}`,
          contenido: item.contenido.trim() || undefined,
        };
        continue;
      }

      if (kind === "capitulos" && titulo) {
        page.capituloLibro = {
          numero: String(core.id),
          titulo,
        };
        continue;
      }

      if (
        (kind === "proyectos" || item.refKind === "project") &&
        item.refId &&
        !page.proyectoAsociado
      ) {
        const project = projectMap.get(item.refId);
        const calibration = calibrationByProjectId.get(item.refId);
        if (project) {
          page.proyectoAsociado = {
            id: project.id,
            nombre: titulo || project.title,
            estado: project.estado,
            friccion: calibration
              ? fogToFriccion(calibration.fogLevel)
              : undefined,
            fogLevel: calibration?.fogLevel,
          };
          continue;
        }
      }

      if (titulo) {
        page.otrasDimensiones.push({
          nombreColeccion: col.nombre,
          tituloElemento: titulo,
        });
      }
    }

    return page;
  });
}

export async function getMagoMatrix(): Promise<MagoMatrixResponse> {
  const [pages, colecciones] = await Promise.all([
    buildPaginasMago22(),
    listMagoColecciones(),
  ]);
  return { pages, colecciones };
}
