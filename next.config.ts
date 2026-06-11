import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@google-cloud/speech",
    "jszip",
    "ffmpeg-static",
    "ffprobe-static",
  ],
};

export default nextConfig;
