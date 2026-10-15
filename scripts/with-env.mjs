// Runs a command with the variables of .env.local loaded (used for the Supabase CLI).
// Usage: node scripts/with-env.mjs <command> [...args]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/with-env.mjs <command> [...args]");
  process.exit(1);
}

const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
