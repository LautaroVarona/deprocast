import "server-only";

import type { HealthDraft, HealthIngestModality } from "@/lib/health/health-broker-types";
import { createHealthRecord } from "@/lib/health/service";
import { prisma } from "@/lib/prisma";

export type NutritionEntryDto = {
  id: string;
  summary: string;
  occurredAt: string;
  sourceChannel: string;
  confidence: number | null;
  totals: { calories?: number; protein?: number; carbs?: number; fat?: number };
  items: Array<{
    id: string;
    name: string;
    quantity: string | null;
    grams: number | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }>;
};

export type TrainingSessionDto = {
  id: string;
  summary: string;
  occurredAt: string;
  sourceChannel: string;
  confidence: number | null;
  durationMin: number | null;
  totalVolumeKg: number | null;
  intensity: string | null;
  sets: Array<{
    id: string;
    exercise: string;
    series: number | null;
    reps: number | null;
    weightKg: number | null;
    durationMin: number | null;
    distanceKm: number | null;
  }>;
};

function dayBounds(day?: Date): { start: Date; end: Date } {
  const base = day ? new Date(day) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function sumVolume(
  sets: Array<{ series?: number | null; reps?: number | null; weightKg?: number | null }>,
): number {
  return sets.reduce((acc, set) => {
    const series = set.series ?? 0;
    const reps = set.reps ?? 0;
    const weight = set.weightKg ?? 0;
    return acc + series * reps * weight;
  }, 0);
}

export async function persistHealthDraft(input: {
  draft: HealthDraft;
  occurredAt: Date;
  sourceChannel: HealthIngestModality;
  sourceRaw?: string;
}): Promise<{ nutritionEntry?: NutritionEntryDto; trainingSession?: TrainingSessionDto }> {
  const occurredAt = input.occurredAt;
  if (input.draft.domain === "alimentacion") {
    const items = input.draft.nutrition?.items ?? [];
    const totals = input.draft.nutrition?.totals;
    const summary = input.draft.summary.trim() || "Ingesta registrada";

    const { record } = await createHealthRecord({
      pillar: "combustible",
      occurredAt,
      summary,
      metrics: {
        kind: "comida",
        modality: input.sourceChannel,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
        totals,
        confidence: input.draft.confidence,
        analyzedBy: "health-broker",
      },
    });

    const entry = await prisma.nutritionEntry.create({
      data: {
        summary,
        sourceChannel: input.sourceChannel,
        sourceRaw: input.sourceRaw ?? null,
        occurredAt,
        parsedBy: "health-broker",
        confidence: input.draft.confidence ?? null,
        totalCalories: totals?.calories ?? null,
        totalProtein: totals?.protein ?? null,
        totalCarbs: totals?.carbs ?? null,
        totalFat: totals?.fat ?? null,
        notes: input.draft.nutrition?.notes ?? null,
        healthRecordId: record.id,
        items: {
          create: items.map((item) => ({
            name: item.name,
            quantity: item.quantity ?? null,
            grams: item.grams ?? null,
            calories: item.calories ?? null,
            protein: item.protein ?? null,
            carbs: item.carbs ?? null,
            fat: item.fat ?? null,
          })),
        },
      },
      include: { items: true },
    });

    return {
      nutritionEntry: {
        id: entry.id,
        summary: entry.summary,
        occurredAt: entry.occurredAt.toISOString(),
        sourceChannel: entry.sourceChannel,
        confidence: entry.confidence,
        totals: {
          calories: entry.totalCalories ?? undefined,
          protein: entry.totalProtein ?? undefined,
          carbs: entry.totalCarbs ?? undefined,
          fat: entry.totalFat ?? undefined,
        },
        items: entry.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          grams: item.grams,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
      },
    };
  }

  const sets = input.draft.training?.sets ?? [];
  const summary = input.draft.summary.trim() || "Entrenamiento registrado";
  const intensity = input.draft.training?.intensity ?? null;
  const durationMin = input.draft.training?.durationMin ?? null;
  const totalVolumeKg = sumVolume(sets);

  const { record } = await createHealthRecord({
    pillar: "rendimiento",
    occurredAt,
    summary,
    metrics: {
      metricType: "duration_min",
      metricValue: durationMin ?? 0,
      durationMin: durationMin ?? 0,
      intensity,
      sets,
      totalVolumeKg,
      analyzedBy: "health-broker",
    },
  });

  const session = await prisma.trainingSession.create({
    data: {
      summary,
      sourceChannel: input.sourceChannel,
      sourceRaw: input.sourceRaw ?? null,
      occurredAt,
      parsedBy: "health-broker",
      confidence: input.draft.confidence ?? null,
      durationMin,
      totalVolumeKg,
      intensity,
      notes: input.draft.training?.notes ?? null,
      healthRecordId: record.id,
      sets: {
        create: sets.map((set) => ({
          exercise: set.exercise,
          series: set.series ?? null,
          reps: set.reps ?? null,
          weightKg: set.weightKg ?? null,
          durationMin: set.durationMin ?? null,
          distanceKm: set.distanceKm ?? null,
          intensity,
        })),
      },
    },
    include: { sets: true },
  });

  return {
    trainingSession: {
      id: session.id,
      summary: session.summary,
      occurredAt: session.occurredAt.toISOString(),
      sourceChannel: session.sourceChannel,
      confidence: session.confidence,
      durationMin: session.durationMin,
      totalVolumeKg: session.totalVolumeKg,
      intensity: session.intensity,
      sets: session.sets.map((set) => ({
        id: set.id,
        exercise: set.exercise,
        series: set.series,
        reps: set.reps,
        weightKg: set.weightKg,
        durationMin: set.durationMin,
        distanceKm: set.distanceKm,
      })),
    },
  };
}

export async function listTodayHealthEntries(day?: Date): Promise<{
  nutritionEntries: NutritionEntryDto[];
  trainingSessions: TrainingSessionDto[];
  nutritionTotals: { calories: number; protein: number; carbs: number; fat: number };
  trainingTotals: { durationMin: number; volumeKg: number };
}> {
  const { start, end } = dayBounds(day);
  const [nutritionEntries, trainingSessions] = await Promise.all([
    prisma.nutritionEntry.findMany({
      where: { occurredAt: { gte: start, lte: end } },
      include: { items: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.trainingSession.findMany({
      where: { occurredAt: { gte: start, lte: end } },
      include: { sets: true },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const nutritionDtos = nutritionEntries.map((entry) => ({
    id: entry.id,
    summary: entry.summary,
    occurredAt: entry.occurredAt.toISOString(),
    sourceChannel: entry.sourceChannel,
    confidence: entry.confidence,
    totals: {
      calories: entry.totalCalories ?? undefined,
      protein: entry.totalProtein ?? undefined,
      carbs: entry.totalCarbs ?? undefined,
      fat: entry.totalFat ?? undefined,
    },
    items: entry.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      grams: item.grams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    })),
  }));

  const trainingDtos = trainingSessions.map((session) => ({
    id: session.id,
    summary: session.summary,
    occurredAt: session.occurredAt.toISOString(),
    sourceChannel: session.sourceChannel,
    confidence: session.confidence,
    durationMin: session.durationMin,
    totalVolumeKg: session.totalVolumeKg,
    intensity: session.intensity,
    sets: session.sets.map((set) => ({
      id: set.id,
      exercise: set.exercise,
      series: set.series,
      reps: set.reps,
      weightKg: set.weightKg,
      durationMin: set.durationMin,
      distanceKm: set.distanceKm,
    })),
  }));

  const nutritionTotals = nutritionDtos.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.totals.calories ?? 0),
      protein: acc.protein + (item.totals.protein ?? 0),
      carbs: acc.carbs + (item.totals.carbs ?? 0),
      fat: acc.fat + (item.totals.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const trainingTotals = trainingDtos.reduce(
    (acc, item) => ({
      durationMin: acc.durationMin + (item.durationMin ?? 0),
      volumeKg: acc.volumeKg + (item.totalVolumeKg ?? 0),
    }),
    { durationMin: 0, volumeKg: 0 },
  );

  return {
    nutritionEntries: nutritionDtos,
    trainingSessions: trainingDtos,
    nutritionTotals,
    trainingTotals,
  };
}
