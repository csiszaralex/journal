import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "path";
import * as schema from "./schema";

const DB_PATH =
  process.env.DATABASE_URL?.replace("file:", "") ?? "./data/journal.db";

const sqlite = new Database(DB_PATH);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;

// Run pending migrations on startup — safe to call repeatedly (no-op if up to date)
migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
