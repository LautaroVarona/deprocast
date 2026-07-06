import "server-only";

import { FOG_LIGHT_DAYS, FOG_THRESHOLD_DAYS } from "@/lib/ludus/constants";
import type { LudusCalibrationProject, LudusProjectStatus } from "@/lib/ludus/types";
import type { Project } from "@/lib/projects/types";
import { stat } from "node:fs/promises";

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function latestProgressDate(project: Project): Date | null {
  if (project.progressEntries.length === 0) return null;
  const dates = project.progressEntries
    .map((entry) => entry.fecha)
    .filter(Boolean)
    .sort()
    .reverse();
  if (dates.length === 0) return null;
  const parsed = new Date(dates[0]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type ProjectLastActivityDate = Date | null;

export async function resolveProjectLastActivity(project: Project): Promise<ProjectLastActivityDate> {
  const progressDate = latestProgressDate(project);
  try {
    const fileStat = await stat(project.filePath);
    const fileDate = fileStat.mtime;
    if (progressDate && progressDate > fileDate) return progressDate;
    return fileDate;
  } catch {
    return progressDate;
  }
}

export function computeFogLevel(
  daysSinceActivity: number | null,
): LudusCalibrationProject["fogLevel"] {
  if (daysSinceActivity === null) return "light";
  if (daysSinceActivity >= FOG_THRESHOLD_DAYS) return "heavy";
  if (daysSinceActivity >= FOG_LIGHT_DAYS) return "light";
  return "none";
}

export function buildCalibrationProject(
  project: Project,
  status: LudusProjectStatus,
  lastActivityAt: Date | null,
): LudusCalibrationProject {
  const now = new Date();
  const daysSinceActivity =
    lastActivityAt !== null ? daysBetween(lastActivityAt, now) : null;

  return {
    id: project.id,
    title: project.title,
    campo: project.campo,
    estado: project.estado,
    status,
    lastActivityAt: lastActivityAt?.toISOString() ?? null,
    daysSinceActivity,
    fogLevel: status === "paused" || status === "inventory" ? "none" : computeFogLevel(daysSinceActivity),
    filePath: project.filePath,
  };
}

export function isSunday(date = new Date()): boolean {
  return date.getDay() === 0;
}
