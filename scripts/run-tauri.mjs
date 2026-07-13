import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const command = process.argv[2];
if (!command) {
  console.error("Usage: node scripts/run-tauri.mjs <dev|build|...>");
  process.exit(1);
}

const cargoBin = join(homedir(), ".cargo", "bin");
const pathSeparator = process.platform === "win32" ? ";" : ":";
const env = {
  ...process.env,
  PATH: `${cargoBin}${pathSeparator}${process.env.PATH ?? ""}`,
};

const result = spawnSync("npx", ["tauri", command, ...process.argv.slice(3)], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
