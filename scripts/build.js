const { execSync } = require("child_process");

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
}

run("next build");
