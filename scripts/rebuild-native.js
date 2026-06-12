const { execSync } = require("child_process");
const path = require("path");

execSync("node ../prebuild-install/bin.js", {
  cwd: path.join(__dirname, "../node_modules/better-sqlite3"),
  stdio: "inherit",
});
