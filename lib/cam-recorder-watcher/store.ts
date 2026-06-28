import fs from "node:fs/promises";
import path from "node:path";
import { getDataPath } from "@/lib/runtime-paths";
import {
  CAM_RECORDER_LATEST_INJECTION_FILE,
  CAM_RECORDER_SESSIONS_FILE,
  CAM_RECORDER_STORAGE_DIR,
} from "./constants";
import type { InjectInput, InjectResult, WatcherSession } from "./types";
import { formatNoteLine } from "./utils";

function getSessionsPath(): string {
  return getDataPath(CAM_RECORDER_STORAGE_DIR, CAM_RECORDER_SESSIONS_FILE);
}

function getLatestInjectionPath(): string {
  return getDataPath(
    CAM_RECORDER_STORAGE_DIR,
    CAM_RECORDER_LATEST_INJECTION_FILE,
  );
}

async function readSessions(): Promise<WatcherSession[]> {
  try {
    const raw = await fs.readFile(getSessionsPath(), "utf8");
    const parsed = JSON.parse(raw) as WatcherSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSessions(sessions: WatcherSession[]): Promise<void> {
  const filePath = getSessionsPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(sessions, null, 2), "utf8");
}

export type DeprocastInjectionPayload = {
  sessionId: string;
  source: "cam-recorder-watcher";
  videoFilename: string;
  videoDurationSeconds: number;
  injectedAt: string;
  notas: WatcherSession["notas"];
  textoConsolidado: string;
  /** Bloques listos para el Calibrador Molecular y auditoría de Jornada (Variable X). */
  particulasTexto: string[];
};

export async function injectToDeprocast(
  input: InjectInput,
): Promise<InjectResult> {
  const injectedAt = new Date().toISOString();
  const textoConsolidado = input.notas
    .map((note) => formatNoteLine(note))
    .join("\n\n");

  const particulasTexto = input.notas.map(
    (note) =>
      `${formatNoteLine(note)}\n\nContexto visual: aplicación activa «${note.appActiva}»; nivel de foco ${note.nivelDeFoco}/12 en el instante ${note.timestamp}.`,
  );

  const session: WatcherSession = {
    id: input.sessionId,
    videoFilename: input.videoFilename,
    videoDurationSeconds: input.videoDurationSeconds,
    notas: input.notas,
    analyzedAt: injectedAt,
    injectedAt,
  };

  const sessions = await readSessions();
  const existingIndex = sessions.findIndex((item) => item.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }
  await writeSessions(sessions);

  const payload: DeprocastInjectionPayload = {
    sessionId: input.sessionId,
    source: "cam-recorder-watcher",
    videoFilename: input.videoFilename,
    videoDurationSeconds: input.videoDurationSeconds,
    injectedAt,
    notas: input.notas,
    textoConsolidado,
    particulasTexto,
  };

  const injectionPath = getLatestInjectionPath();
  await fs.mkdir(path.dirname(injectionPath), { recursive: true });
  await fs.writeFile(injectionPath, JSON.stringify(payload, null, 2), "utf8");

  return {
    sessionId: input.sessionId,
    notasInyectadas: input.notas.length,
    particulasGeneradas: particulasTexto.length,
    textoConsolidado,
    injectedAt,
  };
}

export async function listWatcherSessions(): Promise<WatcherSession[]> {
  return readSessions();
}
