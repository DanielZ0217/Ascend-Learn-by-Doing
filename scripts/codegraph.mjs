import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(projectRoot, "tools", "codegraph-cli", "node_modules", "@colbymchenry", "codegraph", "npm-shim.js");

if (!existsSync(cli)) {
  console.error("CodeGraph is not installed. Run: npm.cmd install --prefix tools/codegraph-cli");
  process.exit(1);
}

const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: join(projectRoot, "web"),
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
