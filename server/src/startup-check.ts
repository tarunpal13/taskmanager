/** Runs after modules load; fails fast with readable logs before accepting traffic. */
export function assertStartupEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.JWT_SECRET?.trim()) missing.push("JWT_SECRET");
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");

  if (missing.length > 0) {
    console.error(
      `[startup] Missing required env: ${missing.join(", ")}\n` +
        `→ Railway: open your **web** service (not Postgres) → Variables → add each variable.`
    );
    process.exit(1);
  }
}
