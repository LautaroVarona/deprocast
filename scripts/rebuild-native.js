const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const betterSqlite3Dir = path.join(__dirname, "../node_modules/better-sqlite3");
const nativeBinary = path.join(
  betterSqlite3Dir,
  "build/Release/better_sqlite3.node",
);

function nativeBinaryExists() {
  try {
    return fs.existsSync(nativeBinary);
  } catch {
    return false;
  }
}

function canLoadNativeModule() {
  if (!nativeBinaryExists()) return false;
  try {
    require(nativeBinary);
    return true;
  } catch {
    return false;
  }
}

function runPrebuildInstall() {
  execSync("node ../prebuild-install/bin.js", {
    cwd: betterSqlite3Dir,
    stdio: "inherit",
  });
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // espera activa breve en script síncrono de postinstall
  }
}

if (canLoadNativeModule()) {
  console.log("better-sqlite3: binario nativo ya disponible, se omite el rebuild.");
  process.exit(0);
}

const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    runPrebuildInstall();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isBusy =
      message.includes("EBUSY") ||
      message.includes("resource busy or locked");

    if (isBusy && nativeBinaryExists()) {
      console.warn(
        "better-sqlite3: no se pudo recompilar porque el binario está en uso.",
      );
      console.warn(
        "Se conserva el binario existente. Cerrá `next dev` u otros procesos Node y ejecutá `npm rebuild better-sqlite3` si hace falta.",
      );
      process.exit(0);
    }

    if (isBusy && attempt < maxAttempts) {
      console.warn(
        `better-sqlite3: archivo bloqueado (intento ${attempt}/${maxAttempts}), reintentando...`,
      );
      sleep(1500);
      continue;
    }

    throw error;
  }
}
