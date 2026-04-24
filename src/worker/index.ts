import cron from "node-cron";
import { format, toZonedTime } from "date-fns-tz";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../db/schema";
import {
  listSubscriptions,
  hasNotificationBeenSent,
  recordNotificationSent,
} from "../db/queries/subscriptions";
import { sendPush, pickDailyPrompt } from "../lib/push";
import { env } from "../env";

const DB_PATH = env.DATABASE_URL.replace("file:", "");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Override the shared db export so the worker has its own connection
const db = drizzle(sqlite, { schema });


function hasEntryToday(dateStr: string): boolean {
  const row = db
    .select({ id: schema.entries.id })
    .from(schema.entries)
    .innerJoin(
      schema.entryVersions,
      eq(schema.entries.current_version_id, schema.entryVersions.id)
    )
    .where(
      and(
        isNull(schema.entries.deleted_at),
        eq(schema.entryVersions.entry_date, dateStr)
      )
    )
    .limit(1)
    .all();
  return row.length > 0;
}

async function tick() {
  const subscriptions = listSubscriptions();
  const nowUtc = new Date();

  for (const sub of subscriptions) {
    if (!sub.enabled) continue;

    const zonedNow = toZonedTime(nowUtc, sub.timezone);
    const currentHour = zonedNow.getHours();
    const currentMinute = zonedNow.getMinutes();

    if (currentHour !== sub.notify_hour || currentMinute !== sub.notify_minute) {
      continue;
    }

    const todayStr = format(zonedNow, "yyyy-MM-dd", { timeZone: sub.timezone });

    if (hasNotificationBeenSent(sub.id, todayStr)) continue;
    if (hasEntryToday(todayStr)) continue;

    const prompt = pickDailyPrompt(todayStr);
    try {
      await sendPush(sub, { title: "Journal", body: prompt });
      recordNotificationSent(sub.id, todayStr);
    } catch {
      // sendPush already disables on 410; other errors are transient
    }
  }
}

console.log("Worker started — notification scheduler running.");

cron.schedule("* * * * *", () => {
  tick().catch(console.error);
});
