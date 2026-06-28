import { MOCK_CONSCIOUSNESS_SCENARIOS } from "./constants";
import type {
  AnalyzeInput,
  AnalyzeResult,
  ConsciousnessNote,
} from "./types";
import {
  clampFocus,
  createNoteId,
  createSessionId,
  formatTimestamp,
} from "./utils";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function distributeTimestamps(
  count: number,
  durationSeconds: number,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.min(5, durationSeconds * 0.1)];

  const margin = Math.min(8, durationSeconds * 0.05);
  const start = margin;
  const end = Math.max(start + 1, durationSeconds - margin);
  const span = end - start;

  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    return start + span * ratio;
  });
}

function buildNotePool(durationSeconds: number): typeof MOCK_CONSCIOUSNESS_SCENARIOS {
  const targetCount = Math.min(
    MOCK_CONSCIOUSNESS_SCENARIOS.length,
    Math.max(4, Math.ceil(durationSeconds / 45)),
  );

  const pool = [...MOCK_CONSCIOUSNESS_SCENARIOS];
  pool.sort((a, b) => b.weight - a.weight);

  const selected: typeof MOCK_CONSCIOUSNESS_SCENARIOS = [];
  let cursor = 0;

  while (selected.length < targetCount && pool.length > 0) {
    selected.push(pool[cursor % pool.length]);
    cursor += 1;
  }

  return selected;
}

export function generateConsciousnessNotes(
  durationSeconds: number,
): ConsciousnessNote[] {
  const safeDuration = Math.max(30, durationSeconds);
  const scenarios = buildNotePool(safeDuration);
  const timestamps = distributeTimestamps(scenarios.length, safeDuration);

  return scenarios.map((scenario, index) => {
    const timestampSeconds = timestamps[index] ?? 0;
    return {
      id: createNoteId(),
      timestamp: formatTimestamp(timestampSeconds),
      timestampSeconds,
      appActiva: scenario.appActiva,
      descripcionDetallada: scenario.descripcionDetallada,
      nivelDeFoco: clampFocus(scenario.nivelDeFoco),
    };
  });
}

export async function* streamConsciousnessNotes(
  durationSeconds: number,
  intervalMs = 380,
): AsyncGenerator<ConsciousnessNote> {
  const notes = generateConsciousnessNotes(durationSeconds);

  for (const note of notes) {
    await sleep(intervalMs);
    yield note;
  }
}

export async function runCamRecorderWatcher(
  input: AnalyzeInput,
): Promise<AnalyzeResult> {
  const started = Date.now();
  const sessionId = createSessionId();
  const durationSeconds = Math.max(1, input.durationSeconds);

  await sleep(Math.min(1200, 400 + durationSeconds * 8));

  const notas = generateConsciousnessNotes(durationSeconds);

  return {
    sessionId,
    notas,
    duracionMs: Date.now() - started,
  };
}
