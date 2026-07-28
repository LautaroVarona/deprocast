import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import {
  breakBossIntoMicrotasks,
  type TaskBreakerEntity,
} from "@/lib/ludus/task-breaker";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      projectId?: string;
      entities?: TaskBreakerEntity[];
      contextString?: string;
      universeSlug?: string;
    };

    const universeSlug =
      body.universeSlug ??
      getUniverseFilterSlugFromRequest(request) ??
      "babel";

    const result = await breakBossIntoMicrotasks({
      projectId: body.projectId,
      entities: Array.isArray(body.entities) ? body.entities : [],
      contextString: body.contextString ?? "",
      universeSlug,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Task-Breaker error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo triturar el Boss.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
