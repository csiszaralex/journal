import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "path";
import * as schema from "./schema";
import { env } from "@/env";

const DB_PATH = (env.DATABASE_URL ?? "file:./data/journal.db").replace("file:", "");

const sqlite = new Database(DB_PATH);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;

// Run pending migrations on startup — safe to call repeatedly (no-op if up to date).
//
// Except during `next build`: collecting page data forks a worker per route (31
// on CI), each importing this module and each racing to migrate the same file.
// The loser re-applies migrations that landed while it waited and dies on
// `table ... already exists` or SQLITE_BUSY, failing the build at random. A
// build has no database to migrate anyway — the web server and the worker
// process both import this module at startup and migrate there.
//
// The value is Next's PHASE_PRODUCTION_BUILD. Compared as a literal on purpose:
// esbuild bundles this module into the notification worker, which must not pull
// in Next (see the worker note in README).
if (process.env.NEXT_PHASE !== "phase-production-build") {
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
}
