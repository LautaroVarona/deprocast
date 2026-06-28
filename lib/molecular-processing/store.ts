import fs from "node:fs/promises";
import path from "node:path";
import { getDataPath } from "@/lib/runtime-paths";
import { computeTaskCurrency } from "@/lib/jornada/utils";
import {
  MOLECULAR_STORAGE_DIR,
  MOLECULAR_VALIDATED_FILE,
} from "./constants";
import type { ParticulaValidada, ValidateInput } from "./types";

function getValidatedStorePath(): string {
  return getDataPath(MOLECULAR_STORAGE_DIR, MOLECULAR_VALIDATED_FILE);
}

async function readValidatedStore(): Promise<ParticulaValidada[]> {
  const filePath = getValidatedStorePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as ParticulaValidada[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeValidatedStore(
  particulas: ParticulaValidada[],
): Promise<void> {
  const filePath = getValidatedStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(particulas, null, 2), "utf8");
}

export async function persistValidatedParticula(
  input: ValidateInput,
): Promise<ParticulaValidada> {
  const { particula } = input;
  const currencyPotencial = computeTaskCurrency(particula.ejeY, particula.ejeZ);

  const record: ParticulaValidada = {
    ...particula,
    currencyPotencial,
    validada: true,
    validadaAt: new Date().toISOString(),
  };

  const store = await readValidatedStore();
  const existingIndex = store.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    store[existingIndex] = record;
  } else {
    store.push(record);
  }

  await writeValidatedStore(store);
  return record;
}

export async function listValidatedParticulas(): Promise<ParticulaValidada[]> {
  return readValidatedStore();
}
