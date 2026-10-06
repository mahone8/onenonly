import { readFileSync } from "fs";
import path from "path";

/**
 * Environment hydration.
 *
 * The sandbox launcher sometimes exports a stale DATABASE_URL (a SQLite
 * file: URL) into the process environment before .env is read. Next.js
 * loads .env but real process env vars take precedence, which would point
 * Prisma at the wrong database.
 *
 * Credentials are NEVER hardcoded here: this helper simply reads the
 * project's .env file and lets .env values override stale launcher
 * exports. Set real env vars in your hosting dashboard for production
 * (see README.md → Deploy).
 */
let hydrated = false;

export function hydrateEnv(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const key = m[1];
      // Strip surrounding quotes if present
      const value = m[2].replace(/^["'](.*)["']$/, "$1");
      if (!value || value.startsWith("#")) continue;
      // .env wins over stale/non-postgres launcher exports
      if (key === "DATABASE_URL" || key === "DIRECT_DATABASE_URL") {
        process.env[key] = value;
      } else if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    /* no .env file — rely on real environment variables (production) */
  }
}

hydrateEnv();
