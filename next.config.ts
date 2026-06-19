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
    "/api/**/*": [
      "./node_modules/better-sqlite3/**/*",
      "./node_modules/ffmpeg-static/**/*",
      "./node_modules/ffprobe-static/**/*",
    ],
  },
};

export default nextConfig;
