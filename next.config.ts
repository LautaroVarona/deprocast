import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOY_TARGET:
      process.env.VERCEL === "1" ? "vercel" : "local",
  },
  serverExternalPackages: [
    "@google-cloud/speech",
    "@google-cloud/vertexai",
    "jszip",
    "ffmpeg-static",
    "ffprobe-static",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
  outputFileTracingIncludes: {
    "/api/**/*": ["./prisma/vercel-build.db"],
  },
  outputFileTracingExcludes: {
    "*": [
      "./datainfo.md",
      "./resumen integral deprocast.md",
      "./deprocast_master_plan.md",
      "./data/**",
      "./prisma/dev.db",
      "./prisma/dev.db-journal",
    ],
  },
};

export default nextConfig;
