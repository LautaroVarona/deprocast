import { execSync } from "node:child_process";

import {
  ensureRuntimeDirs,
  getDatabaseUrl,
  isVercelRuntime,
} from "@/lib/runtime-paths";

let setupPromise: Promise<void> | null = null;

async function runMigrations(): Promise<void> {
  if (!isVercelRuntime() && !process.env.DEPROCAST_RUN_MIGRATIONS?.trim()) {
    return;
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: getDatabaseUrl(),
    },
  });
}

export async function ensureRuntimeReady(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      await ensureRuntimeDirs();
      await runMigrations();
    })().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
}
