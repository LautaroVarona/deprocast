export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureRuntimeReady } = await import("@/lib/runtime-setup");
    await ensureRuntimeReady();
  }
}
