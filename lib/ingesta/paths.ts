import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import path from "node:path";

export const TACHO_DIR = path.join(process.cwd(), "data", "tacho");

export const BABEL_PROJECTS_DIR = path.join(
  process.cwd(),
  "data",
  "projects",
  DEFAULT_CAMPO_SLUG,
);

/** @deprecated Usar BABEL_PROJECTS_DIR */
export const UNCLASSIFIED_PROJECTS_DIR = BABEL_PROJECTS_DIR;
