import "server-only";

import { ASSAULT_BLOCK_OPTIONS } from "@/lib/ludus/constants";
import { computeCampamentoEnergy } from "@/lib/ludus/energy";
import {
  buildCalibrationProject,
  isSunday,
  resolveProjectLastActivity,
} from "@/lib/ludus/project-activity";
import type {
  CampamentoSnapshot,
  CompleteAssaultResult,
  LudusCalibrationSnapshot,
  LudusMicrotaskDto,
  LudusProjectStatus,
  LudusWorldStats,
  TrincheraSnapshot,
} from "@/lib/ludus/types";
import { getLudusWorldStats as getCastilloStats } from "@/lib/castillo/service";
import { listHealthRecords } from "@/lib/health/service";
import { listProjects } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";

const LUDUS_STATE_ID = "singleton";

async function ensureLudusState() {
  return prisma.ludusState.upsert({
    where: { id: LUDUS_STATE_ID },
    create: { id: LUDUS_STATE_ID },
    update: {},
  });
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function mapMicrotask(
  task: {
    id: string;
    projectId: string;
    title: string;
    estimatedMin: number;
    baseWeight: number;
    status: string;
    forgedAt: Date;
  },
  projectTitle: string,
): LudusMicrotaskDto {
  return {
    id: task.id,
    projectId: task.projectId,
    projectTitle,
    title: task.title,
    estimatedMin: task.estimatedMin,
    baseWeight: task.baseWeight,
    status: task.status,
    forgedAt: task.forgedAt.toISOString(),
  };
}

function parseUnlockedStatues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function getSignalPoints(): Promise<number> {
  const state = await ensureLudusState();
  return state.signalPoints;
}

export async function getLudusWorldStats(): Promise<LudusWorldStats> {
  const [castilloStats, state] = await Promise.all([
    getCastilloStats(),
    ensureLudusState(),
  ]);

  return {
    ...castilloStats,
    signalPoints: state.signalPoints,
    unlockedStatues: parseUnlockedStatues(state.unlockedStatues),
  };
}

export async function getCalibrationSnapshot(): Promise<LudusCalibrationSnapshot> {
  const [projects, registryRows] = await Promise.all([
    listProjects(),
    prisma.ludusProjectRegistry.findMany(),
  ]);

  const registry = new Map(
    registryRows.map((row) => [row.projectId, row.status as LudusProjectStatus]),
  );

  const activeProjects = projects.filter(
    (project) => project.estado !== "Descartado" && project.estado !== "Implantado",
  );

  const calibrationProjects = await Promise.all(
    activeProjects.map(async (project) => {
      const lastActivityAt = await resolveProjectLastActivity(project);
      const status = registry.get(project.id) ?? "active";
      return buildCalibrationProject(project, status, lastActivityAt);
    }),
  );

  return {
    isSunday: isSunday(),
    projects: calibrationProjects.sort((a, b) => {
      const fogOrder = { heavy: 0, light: 1, none: 2 };
      return fogOrder[a.fogLevel] - fogOrder[b.fogLevel];
    }),
    activeCount: calibrationProjects.filter((project) => project.status === "active")
      .length,
    foggedCount: calibrationProjects.filter((project) => project.fogLevel !== "none")
      .length,
  };
}

export async function updateProjectLudusStatus(
  projectId: string,
  status: LudusProjectStatus,
): Promise<void> {
  await prisma.ludusProjectRegistry.upsert({
    where: { projectId },
    create: {
      projectId,
      status,
      lastCalibratedAt: new Date(),
    },
    update: {
      status,
      lastCalibratedAt: new Date(),
    },
  });
}

export async function countGoldenPrioritiesToday(): Promise<number> {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.ludusMicrotask.count({
    where: {
      status: { in: ["pending", "in_progress", "done"] },
      baseWeight: { gte: 8 },
      forgedAt: { gte: today, lt: tomorrow },
    },
  });
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function getCampamentoSnapshot(): Promise<CampamentoSnapshot> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [projects, microtasks, healthRecords, goldenCount] = await Promise.all([
    listProjects(),
    prisma.ludusMicrotask.findMany({
      where: { status: { in: ["pending", "in_progress"] } },
      orderBy: { forgedAt: "desc" },
      take: 40,
    }),
    listHealthRecords({ from: weekAgo, limit: 80 }),
    countGoldenPrioritiesToday(),
  ]);

  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const energy = computeCampamentoEnergy(healthRecords, goldenCount);

  return {
    energy,
    microtasks: microtasks.map((task) =>
      mapMicrotask(task, projectMap.get(task.projectId)?.title ?? "Proyecto"),
    ),
    projects: projects
      .filter((project) => project.estado !== "Descartado")
      .map((project) => ({
        id: project.id,
        title: project.title,
        campo: project.campo,
      })),
  };
}

export async function forgeMicrotask(input: {
  projectId: string;
  title: string;
  estimatedMin?: number;
  baseWeight?: number;
  isGolden?: boolean;
}): Promise<{ microtask: LudusMicrotaskDto; energy: CampamentoSnapshot["energy"] }> {
  const snapshot = await getCampamentoSnapshot();
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("El título de la microtarea es obligatorio.");
  }

  const estimatedMin = Math.min(15, Math.max(5, input.estimatedMin ?? 15));
  const baseWeight = input.isGolden
    ? Math.max(8, input.baseWeight ?? 8)
    : Math.min(7, Math.max(1, input.baseWeight ?? 3));

  if (input.isGolden && !snapshot.energy.canAssignMoreGolden) {
    throw new Error(
      snapshot.energy.lowTelemetry
        ? "Telemetría baja: solo podés asignar 1 Prioridad Dorada por día."
        : "Alcanzaste el límite de Prioridades Doradas para hoy.",
    );
  }

  const project = snapshot.projects.find((item) => item.id === input.projectId);
  if (!project) {
    throw new Error("Proyecto no encontrado.");
  }

  const created = await prisma.ludusMicrotask.create({
    data: {
      projectId: input.projectId,
      title: trimmedTitle,
      estimatedMin,
      baseWeight,
    },
  });

  const refreshed = await getCampamentoSnapshot();

  return {
    microtask: mapMicrotask(created, project.title),
    energy: refreshed.energy,
  };
}

export async function getTrincheraSnapshot(): Promise<TrincheraSnapshot> {
  const [state, microtasks, recentAssaults] = await Promise.all([
    ensureLudusState(),
    prisma.ludusMicrotask.findMany({
      where: { status: { in: ["pending", "in_progress"] } },
      orderBy: [{ baseWeight: "desc" }, { forgedAt: "asc" }],
      take: 12,
    }),
    prisma.ludusAssaultSession.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const projects = await listProjects();
  const projectMap = new Map(projects.map((project) => [project.id, project.title]));

  const today = todayKey();
  const assaultStreakToday =
    state.lastAssaultDate === today ? state.assaultStreakToday : 0;

  return {
    signalPoints: state.signalPoints,
    assaultStreakToday,
    pendingMicrotasks: microtasks.map((task) =>
      mapMicrotask(task, projectMap.get(task.projectId) ?? "Proyecto"),
    ),
    blockOptions: ASSAULT_BLOCK_OPTIONS,
    recentAssaults: recentAssaults.map((assault) => ({
      id: assault.id,
      microtaskId: assault.microtaskId,
      title: assault.title,
      durationMin: assault.durationMin,
      startedAt: assault.startedAt.toISOString(),
      endsAt: new Date(
        assault.startedAt.getTime() + assault.durationMin * 60_000,
      ).toISOString(),
      completed: assault.completed,
      signalPoints: assault.signalPoints,
    })),
  };
}

export async function startAssault(input: {
  title: string;
  durationMin: number;
  microtaskId?: string;
}): Promise<TrincheraSnapshot["recentAssaults"][number]> {
  const title = input.title.trim();
  if (!title) throw new Error("Definí una tarea para el asalto.");

  const durationMin = ASSAULT_BLOCK_OPTIONS.some(
    (option) => option.minutes === input.durationMin,
  )
    ? input.durationMin
    : 25;

  if (input.microtaskId) {
    await prisma.ludusMicrotask.updateMany({
      where: { id: input.microtaskId, status: "pending" },
      data: { status: "in_progress" },
    });
  }

  const startedAt = new Date();
  const assault = await prisma.ludusAssaultSession.create({
    data: {
      title,
      durationMin,
      startedAt,
      microtaskId: input.microtaskId ?? null,
    },
  });

  return {
    id: assault.id,
    microtaskId: assault.microtaskId,
    title: assault.title,
    durationMin: assault.durationMin,
    startedAt: assault.startedAt.toISOString(),
    endsAt: new Date(startedAt.getTime() + durationMin * 60_000).toISOString(),
    completed: false,
    signalPoints: 0,
  };
}

export async function completeAssault(input: {
  assaultId: string;
  tabSurvived: boolean;
  completed: boolean;
}): Promise<CompleteAssaultResult> {
  const assault = await prisma.ludusAssaultSession.findUnique({
    where: { id: input.assaultId },
    include: { microtask: true },
  });

  if (!assault) throw new Error("Asalto no encontrado.");
  if (assault.endedAt) throw new Error("Este asalto ya fue cerrado.");

  const state = await ensureLudusState();
  const today = todayKey();
  const previousStreak =
    state.lastAssaultDate === today ? state.assaultStreakToday : 0;
  const streakBonus =
    input.completed && input.tabSurvived
      ? Math.min(1.5, 1 + previousStreak * 0.1)
      : 1;

  const baseWeight = assault.microtask?.baseWeight ?? 3;
  const completionMultiplier = input.completed ? 1 : 0.5;
  const signalPointsEarned =
    input.tabSurvived && input.completed
      ? Math.ceil(baseWeight * completionMultiplier * streakBonus)
      : 0;

  const endedAt = new Date();
  const nextStreak =
    input.completed && input.tabSurvived ? previousStreak + 1 : 0;

  await prisma.$transaction([
    prisma.ludusAssaultSession.update({
      where: { id: assault.id },
      data: {
        endedAt,
        completed: input.completed,
        tabSurvived: input.tabSurvived,
        signalPoints: signalPointsEarned,
      },
    }),
    prisma.ludusState.update({
      where: { id: LUDUS_STATE_ID },
      data: {
        signalPoints: { increment: signalPointsEarned },
        assaultStreakToday: nextStreak,
        lastAssaultDate: today,
      },
    }),
  ]);

  if (input.completed && assault.microtaskId) {
    await prisma.ludusMicrotask.update({
      where: { id: assault.microtaskId },
      data: { status: "done" },
    });
  }

  const updatedState = await ensureLudusState();

  return {
    assault: {
      id: assault.id,
      microtaskId: assault.microtaskId,
      title: assault.title,
      durationMin: assault.durationMin,
      startedAt: assault.startedAt.toISOString(),
      endsAt: endedAt.toISOString(),
      completed: input.completed,
      signalPoints: signalPointsEarned,
    },
    signalPointsEarned,
    totalSignalPoints: updatedState.signalPoints,
    streakBonus,
  };
}

export async function unlockStatue(statueId: string): Promise<LudusWorldStats> {
  const { LUDUS_STATUES } = await import("@/lib/ludus/constants");
  const statue = LUDUS_STATUES.find((item) => item.id === statueId);
  if (!statue) throw new Error("Estatua no encontrada.");

  const state = await ensureLudusState();
  const unlocked = parseUnlockedStatues(state.unlockedStatues);

  if (unlocked.includes(statueId)) {
    throw new Error("Esta estatua ya está desbloqueada.");
  }

  if (state.signalPoints < statue.cost) {
    throw new Error(`Necesitás ${statue.cost} Puntos de Señal.`);
  }

  await prisma.ludusState.update({
    where: { id: LUDUS_STATE_ID },
    data: {
      signalPoints: { decrement: statue.cost },
      unlockedStatues: [...unlocked, statueId],
    },
  });

  return getLudusWorldStats();
}
