const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(command, options = {}) {
  execSync(command, { stdio: "inherit", ...options });
}

run("prisma generate");

if (process.env.VERCEL === "1") {
  run("prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: "file:./prisma/vercel-build.db",
    },
  });

  const seedPath = path.join(__dirname, "../prisma/vercel-build.db");
  if (!fs.existsSync(seedPath)) {
    console.error(
      "Build abortado: no se generó prisma/vercel-build.db tras migrate deploy.",
    );
    process.exit(1);
  }

  const size = fs.statSync(seedPath).size;
  if (size < 1024) {
    console.error(
      `Build abortado: prisma/vercel-build.db parece vacío (${size} bytes).`,
    );
    process.exit(1);
  }

  const bundledSeedDir = path.join(__dirname, "../lib/db");
  const bundledSeedPath = path.join(bundledSeedDir, "vercel-build.db");
  fs.mkdirSync(bundledSeedDir, { recursive: true });
  fs.copyFileSync(seedPath, bundledSeedPath);

  const seedBuffer = fs.readFileSync(bundledSeedPath);
  if (!seedBuffer.includes(Buffer.from("AudioAsset"))) {
    console.error(
      "Build abortado: vercel-build.db no contiene el esquema AudioAsset.",
    );
    process.exit(1);
  }

  console.log(
    `prisma/vercel-build.db listo (${size} bytes) y copiado a lib/db/.`,
  );
}

run("next build");
