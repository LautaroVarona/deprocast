"use client";

import { MinusIcon, PlusIcon } from "lucide-react";

export type FoodRow = {
  name: string;
  quantity?: string;
  grams?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type TrainingRow = {
  exercise: string;
  series?: number;
  reps?: number;
  weightKg?: number;
};

type Props = {
  mode: "alimentacion" | "entrenamiento";
  foodRows: FoodRow[];
  trainingRows: TrainingRow[];
  onFoodRowsChange: (rows: FoodRow[]) => void;
  onTrainingRowsChange: (rows: TrainingRow[]) => void;
};

const emptyFoodRow = (): FoodRow => ({
  name: "",
  quantity: "",
  grams: undefined,
  calories: undefined,
  protein: undefined,
  carbs: undefined,
  fat: undefined,
});

const emptyTrainingRow = (): TrainingRow => ({
  exercise: "",
  series: undefined,
  reps: undefined,
  weightKg: undefined,
});

function NumberCell({
  value,
  placeholder,
  onChange,
}: {
  value?: number;
  placeholder: string;
  onChange: (next?: number) => void;
}) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value ? Number(e.target.value) : undefined)
      }
      placeholder={placeholder}
      inputMode="decimal"
      className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
    />
  );
}

export function HealthQuickTable({
  mode,
  foodRows,
  trainingRows,
  onFoodRowsChange,
  onTrainingRowsChange,
}: Props) {
  if (mode === "alimentacion") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[minmax(0,1.2fr)_90px_60px_58px_50px_50px_50px_28px] gap-1">
          <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            Alimento
          </span>
          <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            Cant.
          </span>
          <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            g
          </span>
          <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            kcal
          </span>
          <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            P
          </span>
          <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            C
          </span>
          <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            G
          </span>
          <span />
          {foodRows.map((row, idx) => (
            <div key={`food-${idx}`} className="contents">
              <input
                value={row.name}
                onChange={(e) => {
                  const next = [...foodRows];
                  next[idx] = { ...next[idx], name: e.target.value };
                  onFoodRowsChange(next);
                }}
                placeholder="Alimento"
                className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
              />
              <input
                value={row.quantity ?? ""}
                onChange={(e) => {
                  const next = [...foodRows];
                  next[idx] = { ...next[idx], quantity: e.target.value };
                  onFoodRowsChange(next);
                }}
                placeholder="Cantidad"
                className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
              />
              <NumberCell
                value={row.grams}
                placeholder="g"
                onChange={(grams) => {
                  const next = [...foodRows];
                  next[idx] = { ...next[idx], grams };
                  onFoodRowsChange(next);
                }}
              />
              <NumberCell
                value={row.calories}
                placeholder="kcal"
                onChange={(calories) => {
                  const next = [...foodRows];
                  next[idx] = { ...next[idx], calories };
                  onFoodRowsChange(next);
                }}
              />
              <NumberCell
                value={row.protein}
                placeholder="P"
                onChange={(protein) => {
                  const next = [...foodRows];
                  next[idx] = { ...next[idx], protein };
                  onFoodRowsChange(next);
                }}
              />
              <NumberCell
                value={row.carbs}
                placeholder="C"
                onChange={(carbs) => {
                  const next = [...foodRows];
                  next[idx] = { ...next[idx], carbs };
                  onFoodRowsChange(next);
                }}
              />
              <NumberCell
                value={row.fat}
                placeholder="G"
                onChange={(fat) => {
                  const next = [...foodRows];
                  next[idx] = { ...next[idx], fat };
                  onFoodRowsChange(next);
                }}
              />
              <button
                type="button"
                aria-label="Quitar fila"
                disabled={foodRows.length <= 1}
                onClick={() =>
                  onFoodRowsChange(foodRows.filter((_, i) => i !== idx))
                }
                className="inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <MinusIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onFoodRowsChange([...foodRows, emptyFoodRow()])}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <PlusIcon className="size-3" /> Añadir fila
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px_28px] gap-1">
        <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          Ejercicio
        </span>
        <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          Series
        </span>
        <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          Reps
        </span>
        <span className="px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          Kg
        </span>
        <span />
        {trainingRows.map((row, idx) => (
          <div key={`train-${idx}`} className="contents">
            <input
              value={row.exercise}
              onChange={(e) => {
                const next = [...trainingRows];
                next[idx] = { ...next[idx], exercise: e.target.value };
                onTrainingRowsChange(next);
              }}
              placeholder="Ejercicio"
              className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
            />
            <NumberCell
              value={row.series}
              placeholder="Series"
              onChange={(series) => {
                const next = [...trainingRows];
                next[idx] = { ...next[idx], series };
                onTrainingRowsChange(next);
              }}
            />
            <NumberCell
              value={row.reps}
              placeholder="Reps"
              onChange={(reps) => {
                const next = [...trainingRows];
                next[idx] = { ...next[idx], reps };
                onTrainingRowsChange(next);
              }}
            />
            <NumberCell
              value={row.weightKg}
              placeholder="Kg"
              onChange={(weightKg) => {
                const next = [...trainingRows];
                next[idx] = { ...next[idx], weightKg };
                onTrainingRowsChange(next);
              }}
            />
            <button
              type="button"
              aria-label="Quitar fila"
              disabled={trainingRows.length <= 1}
              onClick={() =>
                onTrainingRowsChange(trainingRows.filter((_, i) => i !== idx))
              }
              className="inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <MinusIcon className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onTrainingRowsChange([...trainingRows, emptyTrainingRow()])}
        className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <PlusIcon className="size-3" /> Añadir fila
      </button>
    </div>
  );
}
