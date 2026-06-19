export function getDeployLabel(): string {
  return process.env.NEXT_PUBLIC_DEPLOY_TARGET === "vercel" ? "Vercel" : "local";
}
