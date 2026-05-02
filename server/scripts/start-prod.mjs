#!/usr/bin/env node
/**
 * Railway-safe startup: clear logs for migrate failures (common crash loop cause).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(serverDir);

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "[start-prod] DATABASE_URL is empty.\n" +
      "→ Railway: add Postgres and reference DATABASE_URL on this **same** Node service."
  );
  process.exit(1);
}

console.log("[start-prod] prisma migrate deploy …");
const migrate = spawnSync("npm", ["run", "db:migrate"], {
  cwd: serverDir,
  stdio: "inherit",
  env: process.env,
});

if (migrate.status !== 0) {
  console.error(
    "[start-prod] Migration failed.\n" +
      "→ If you use a **connection pooler** URL, try the **direct** Postgres URL from Railway for DATABASE_URL.\n" +
      "→ Ensure Postgres is running and DATABASE_URL has ssl if required (?sslmode=require)."
  );
  process.exit(migrate.status ?? 1);
}

console.log("[start-prod] starting API …");
const run = spawnSync(process.execPath, ["dist/index.js"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(run.status ?? 1);
