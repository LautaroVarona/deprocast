import { getDatabaseFilePath, getDatabaseSeedPath, isVercelRuntime } from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import fs from "node:fs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, unknown> = {
    vercel: isVercelRuntime(),
    node: process.version,
  };

  try {
    await ensureRuntimeReady();
    checks.runtime = "ok";
    checks.databasePath = getDatabaseFilePath();
    checks.seedPath = getDatabaseSeedPath();
    checks.seedExists = fs.existsSync(getDatabaseSeedPath());
    checks.databaseExists = fs.existsSync(getDatabaseFilePath());
  } catch (error) {
    checks.runtime = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const audioAssets = await prisma.audioAsset.count();
    checks.database = { ok: true, audioAssets };
  } catch (error) {
    checks.database = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const ok = checks.runtime === "ok" && (checks.database as { ok?: boolean })?.ok === true;

  return NextResponse.json(checks, { status: ok ? 200 : 500 });
}
