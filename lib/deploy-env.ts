export function getDeployLabel(): string {
  return process.env.NEXT_PUBLIC_DEPLOY_TARGET === "vercel" ? "Vercel" : "local";
}

/** True when running on Vercel without a public persistent-volume hint (UI copy only). */
export function isEphemeralDeployTarget(): boolean {
  return process.env.NEXT_PUBLIC_DEPLOY_TARGET === "vercel";
}
