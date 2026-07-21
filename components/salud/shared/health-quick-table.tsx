"use client";

type FoodRow = {
  name: string;
  quantity?: string;
  grams?: number;
};

type TrainingRow = {
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

export function HealthQuickTable({
  mode,
  foodRows,
  trainingRows,
  onFoodRowsChange,
  onTrainingRowsChange,
}: Props) {
  if (mode === "alimentacion") {
    return (
      <div className="grid grid-cols-[1fr_110px_90px] gap-1">
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
              className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-100"
            />
            <input
              value={row.quantity ?? ""}
              onChange={(e) => {
                const next = [...foodRows];
                next[idx] = { ...next[idx], quantity: e.target.value };
                onFoodRowsChange(next);
              }}
              placeholder="Cantidad"
              className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-100"
            />
            <input
              value={row.grams ?? ""}
              onChange={(e) => {
                const next = [...foodRows];
                next[idx] = {
                  ...next[idx],
                  grams: e.target.value ? Number(e.target.value) : undefined,
                };
                onFoodRowsChange(next);
              }}
              placeholder="g"
              className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-100"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_70px_70px_70px] gap-1">
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
            className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-100"
          />
          <input
            value={row.series ?? ""}
            onChange={(e) => {
              const next = [...trainingRows];
              next[idx] = {
                ...next[idx],
                series: e.target.value ? Number(e.target.value) : undefined,
              };
              onTrainingRowsChange(next);
            }}
            placeholder="Series"
            className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-100"
          />
          <input
            value={row.reps ?? ""}
            onChange={(e) => {
              const next = [...trainingRows];
              next[idx] = {
                ...next[idx],
                reps: e.target.value ? Number(e.target.value) : undefined,
              };
              onTrainingRowsChange(next);
            }}
            placeholder="Reps"
            className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-100"
          />
          <input
            value={row.weightKg ?? ""}
            onChange={(e) => {
              const next = [...trainingRows];
              next[idx] = {
                ...next[idx],
                weightKg: e.target.value ? Number(e.target.value) : undefined,
              };
              onTrainingRowsChange(next);
            }}
            placeholder="Kg"
            className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-100"
          />
        </div>
      ))}
    </div>
  );
}
