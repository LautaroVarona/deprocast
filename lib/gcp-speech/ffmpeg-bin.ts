import { execFile } from "child_process";
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { promisify } from "util";
import { GcpSpeechError } from "@/lib/gcp-speech/errors";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

function isWindows(): boolean {
  return process.platform === "win32";
}

function resolveEnvBinary(envValue: string | undefined): string | null {
  const raw = envValue?.trim();
  if (!raw) {
    return null;
  }

  const resolved = path.isAbsolute(raw)
    ? raw
    : path.resolve(process.cwd(), raw);

  if (fs.existsSync(resolved)) {
    return resolved;
  }

  console.warn(
    `Ruta de binario definida en .env pero no encontrada (${resolved}). Se ignorará.`,
  );
  return null;
}

function resolveFfmpegFromNodeModules(): string | null {
  const fileName = isWindows() ? "ffmpeg.exe" : "ffmpeg";
  const candidates = [
    path.join(process.cwd(), "node_modules", "ffmpeg-static", fileName),
  ];

  try {
    const packageDir = path.dirname(
      require.resolve("ffmpeg-static/package.json"),
    );
    candidates.unshift(path.join(packageDir, fileName));
  } catch {
    // ffmpeg-static no instalado
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveFfprobeFromNodeModules(): string | null {
  const fileName = isWindows() ? "ffprobe.exe" : "ffprobe";
  const candidates = [
    path.join(
      process.cwd(),
      "node_modules",
      "ffprobe-static",
      "bin",
      process.platform,
      process.arch,
      fileName,
    ),
  ];

  try {
    const packageDir = path.dirname(
      require.resolve("ffprobe-static/package.json"),
    );
    candidates.unshift(
      path.join(packageDir, "bin", process.platform, process.arch, fileName),
    );
  } catch {
    // ffprobe-static no instalado
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveBinary(
  envValue: string | undefined,
  nodeModulesResolver: () => string | null,
  fallbackName: string,
): string {
  const fromEnv = resolveEnvBinary(envValue);
  if (fromEnv) {
    return fromEnv;
  }

  const fromNodeModules = nodeModulesResolver();
  if (fromNodeModules) {
    return fromNodeModules;
  }

  return fallbackName;
}

export function getFfmpegPath(): string {
  return resolveBinary(
    process.env.FFMPEG_PATH,
    resolveFfmpegFromNodeModules,
    "ffmpeg",
  );
}

export function getFfprobePath(): string {
  return resolveBinary(
    process.env.FFPROBE_PATH,
    resolveFfprobeFromNodeModules,
    "ffprobe",
  );
}

function isMissingBinaryError(message: string): boolean {
  return (
    message.includes("ENOENT") ||
    /no se reconoce como un comando|not recognized as an internal or external command/i.test(
      message,
    )
  );
}

function missingBinaryMessage(tool: "FFmpeg" | "ffprobe"): string {
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();

  return (
    `${tool} no está disponible. ` +
    `Rutas probadas: FFmpeg=${ffmpegPath}, ffprobe=${ffprobePath}. ` +
    "Ejecutá `npm install` en el proyecto. Si usás FFMPEG_PATH/FFPROBE_PATH en .env, " +
    "verificá que apunten a archivos reales (no dejes el valor de ejemplo)."
  );
}

export async function runFfmpeg(args: string[]): Promise<void> {
  const ffmpegPath = getFfmpegPath();

  try {
    await execFileAsync(ffmpegPath, args, {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isMissingBinaryError(message)) {
      throw new GcpSpeechError(missingBinaryMessage("FFmpeg"));
    }

    throw new GcpSpeechError(`FFmpeg falló: ${message}`);
  }
}

export async function runFfprobe(args: string[]): Promise<string> {
  const ffprobePath = getFfprobePath();

  try {
    const { stdout } = await execFileAsync(ffprobePath, args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isMissingBinaryError(message)) {
      throw new GcpSpeechError(missingBinaryMessage("ffprobe"));
    }

    throw new GcpSpeechError(`ffprobe falló: ${message}`);
  }
}
