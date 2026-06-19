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
    "*": [
      "./prisma/vercel-build.db",
      "./lib/db/vercel-build.db",
      "./node_modules/better-sqlite3/**",
      "./node_modules/@prisma/adapter-better-sqlite3/**",
      "./node_modules/@google-cloud/vertexai/**",
      "./node_modules/@google-cloud/speech/**",
      "./node_modules/@google/genai/**",
      "./node_modules/@google/genai/node_modules/**",
      "./node_modules/gcp-metadata/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/gaxios/**",
      "./node_modules/google-logging-utils/**",
      "./node_modules/json-bigint/**",
      "./node_modules/bignumber.js/**",
    ],
    "/api/**/*": [
      "./prisma/vercel-build.db",
      "./lib/db/vercel-build.db",
      "./node_modules/better-sqlite3/**",
      "./node_modules/@prisma/adapter-better-sqlite3/**",
      "./node_modules/@google-cloud/vertexai/**",
      "./node_modules/@google-cloud/speech/**",
      "./node_modules/@google/genai/**",
      "./node_modules/@google/genai/node_modules/**",
      "./node_modules/gcp-metadata/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/gaxios/**",
      "./node_modules/google-logging-utils/**",
      "./node_modules/json-bigint/**",
      "./node_modules/bignumber.js/**",
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
