import {
  createPendingTask,
  listPendingTasks,
} from "@/lib/pendientes/store";
import {
  createPendingTaskSchema,
  isDayOffset,
  isPendingTaskStatus,
} from "@/lib/pendientes/types";
import { selectAsaltosForDay } from "@/lib/pendientes/asaltos";
import { isUniverseSlug } from "@/lib/babel/context-seal";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = request.nextUrl;
    const dayParam = searchParams.get("day");
    const statusParam = searchParams.get("status");
    const asaltos = searchParams.get("asaltos") === "true";
    const allDays = searchParams.get("allDays") === "true" || !dayParam;
    const universeParam = searchParams.get("universe") ?? undefined;

    if (universeParam && !isUniverseSlug(universeParam)) {
      return NextResponse.json({ error: "Universo inválido." }, { status: 400 });
    }

    if (asaltos) {
      const dayForAsaltos = dayParam && isDayOffset(dayParam) ? dayParam : "today";
      const items = await selectAsaltosForDay(dayForAsaltos, universeParam);
      return NextResponse.json({
        asaltos: items,
        day: dayForAsaltos,
        universe: universeParam ?? null,
      });
    }

    if (dayParam && !isDayOffset(dayParam)) {
      return NextResponse.json({ error: "Día inválido." }, { status: 400 });
    }

    const statuses = statusParam
      ? statusParam.split(",").filter(isPendingTaskStatus)
      : undefined;

    const tasks = await listPendingTasks({
      day: dayParam && isDayOffset(dayParam) ? dayParam : undefined,
      status: statuses,
      allDays,
      universeSlug: universeParam,
    });

    return NextResponse.json({
      tasks,
      day: dayParam && isDayOffset(dayParam) ? dayParam : null,
      universe: universeParam ?? null,
    });
  } catch (error) {
    console.error("Pendientes GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron listar tareas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const parsed = createPendingTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const { resolveDayOffset } = await import("@/lib/pendientes/day");
    const targetDay = resolveDayOffset(parsed.data.targetDay ?? "today");

    const task = await createPendingTask({
      title: parsed.data.title,
      description: parsed.data.description,
      source: "manual",
      targetDay,
      bloque: parsed.data.bloque,
      projectId: parsed.data.projectId,
      status: "recognized",
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Pendientes POST error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la tarea.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
