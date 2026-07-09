import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOY_TARGET:
      process.env.VERCEL === "1" ? "vercel" : "local",
  },
  serverExternalPackages: [
    "@deepgram/sdk",
    "cohere-ai",
    "jszip",
    "ffmpeg-static",
    "ffprobe-static",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
  outputFileTracingIncludes: {
    "*": [
      "./prisma/vercel-build.db",
      "./lib/db/vercel-build.db",
      "./node_modules/better-sqlite3/**",
      "./node_modules/@prisma/adapter-better-sqlite3/**",
      "./node_modules/@deepgram/sdk/**",
      "./node_modules/cohere-ai/**",
    ],
    "/api/**/*": [
      "./prisma/vercel-build.db",
      "./lib/db/vercel-build.db",
      "./node_modules/better-sqlite3/**",
      "./node_modules/@prisma/adapter-better-sqlite3/**",
      "./node_modules/@deepgram/sdk/**",
      "./node_modules/cohere-ai/**",
    ],
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
