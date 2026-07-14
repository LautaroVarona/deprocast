import { extractLinkedCampoSlugs, type Campo } from "@/lib/projects/campos";
import {
  createCampo,
  getCampo,
  listCampos,
  listProjects,
} from "@/lib/projects/service";
import type { Project } from "@/lib/projects/types";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { filterProjectsForUniverse } from "@/lib/babel/universe-refs";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const universeSlug = getUniverseFilterSlugFromRequest(request);

    const [campos, allProjects] = await Promise.all([
      listCampos(universeSlug),
      listProjects(),
    ]);
    const projects = await filterProjectsForUniverse(allProjects, universeSlug);

    const camposWithProjects = await Promise.all(
      campos.map(async (info) => {
        const detailed = await getCampo(info.slug);
        return (
          detailed ?? {
            ...info,
            description: info.description ?? "",
            createdAt: "",
            projectIds: projects
              .filter((project) => project.campoSlug === info.slug)
              .map((project) => project.id),
          }
        );
      }),
    );

    const projectsByCampo = projects.reduce<Record<string, Project[]>>((acc, project) => {
      for (const slug of extractLinkedCampoSlugs(project)) {
        const list = acc[slug] ?? [];
        if (!list.some((item) => item.id === project.id)) {
          list.push(project);
        }
        acc[slug] = list;
      }
      return acc;
    }, {});

    return NextResponse.json({
      campos: camposWithProjects satisfies Campo[],
      projectsByCampo,
      universe: universeSlug ?? "babel",
    });
  } catch (error) {
    console.error("List campos error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los Campos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      label?: string;
      description?: string;
      universeSlug?: string;
    };
    if (!body.label?.trim()) {
      return NextResponse.json(
        { error: "El nombre del Campo es obligatorio." },
        { status: 400 },
      );
    }

    const campo = await createCampo({
      label: body.label,
      description: body.description,
      universeSlug: body.universeSlug,
    });

    return NextResponse.json({ campo }, { status: 201 });
  } catch (error) {
    console.error("Create campo error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear el Campo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
