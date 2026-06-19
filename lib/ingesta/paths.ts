import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import { getDataPath } from "@/lib/runtime-paths";
import path from "node:path";

export const TACHO_DIR = getDataPath("tacho");

export const BABEL_PROJECTS_DIR = getDataPath("projects", DEFAULT_CAMPO_SLUG);

/** @deprecated Usar BABEL_PROJECTS_DIR */
export const UNCLASSIFIED_PROJECTS_DIR = BABEL_PROJECTS_DIR;
