export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Evita trabajo de filesystem durante `next build`.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  try {
    const { ensureRuntimeReady } = await import("@/lib/runtime-setup");
    await ensureRuntimeReady();
  } catch (error) {
    console.error("[instrumentation] ensureRuntimeReady failed:", error);
  }
}
