import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { coagulateMicrotasks } from "@/lib/ludus/task-breaker";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const coagulateSchema = z.object({
  microtasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(300),
        description: z.string().trim().max(2000).optional(),
        estimatedMinutes: z.number().int().min(15).max(40),
        gravityWeight: z.number().int().min(1).max(12),
        projectId: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(16),
  universeSlug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const parsed = coagulateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }

    const universeSlug =
      parsed.data.universeSlug ??
      getUniverseFilterSlugFromRequest(request) ??
      "babel";

    const result = await coagulateMicrotasks({
      microtasks: parsed.data.microtasks,
      universeSlug,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Task-Breaker coagulate error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron coagular las microtareas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
