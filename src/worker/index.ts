import cron from "node-cron";
import { format, toZonedTime } from "date-fns-tz";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import * as schema from "../db/schema";
import {
  listSubscriptions,
  hasNotificationBeenSent,
  recordNotificationSent,
} from "../db/queries/subscriptions";
import { sendPush, pickDailyPrompt, getPromptCount } from "../lib/push";
import { env } from "../env";

function maskSubject(subject: string): string {
  // mailto:foo@bar.com → mailto:f**@bar.com
  const match = subject.match(/^(mailto:)([^@]+)(@.+)$/i);
  if (!match) return subject.slice(0, 12) + "…";
  const [, prefix, local, domain] = match;
  return `${prefix}${local[0] ?? ""}**${domain}`;
}

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

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const subscriptions = listSubscriptions();
    const nowUtc = new Date();
    let matched = 0;

    for (const sub of subscriptions) {
      if (!sub.enabled) continue;

      const zonedNow = toZonedTime(nowUtc, sub.timezone);
      const currentHour = zonedNow.getHours();
      const currentMinute = zonedNow.getMinutes();

      if (currentHour !== sub.notify_hour || currentMinute !== sub.notify_minute) {
        continue;
      }

      matched++;
      const todayStr = format(zonedNow, "yyyy-MM-dd", { timeZone: sub.timezone });

      if (hasNotificationBeenSent(sub.id, todayStr)) {
        console.log(JSON.stringify({ evt: "tick.skip", reason: "already-sent", sub: sub.id, label: sub.device_label, date: todayStr }));
        continue;
      }
      if (hasEntryToday(todayStr)) {
        console.log(JSON.stringify({ evt: "tick.skip", reason: "entry-exists", sub: sub.id, label: sub.device_label, date: todayStr }));
        continue;
      }

      const body = pickDailyPrompt(todayStr);
      try {
        const result = await sendPush(sub, { title: "Journal", body });
        if (result.status === "sent") {
          recordNotificationSent(sub.id, todayStr);
          console.log(JSON.stringify({ evt: "tick.sent", sub: sub.id, label: sub.device_label, date: todayStr }));
        } else if (result.status === "gone") {
          console.warn(JSON.stringify({ evt: "tick.gone", sub: sub.id, label: sub.device_label, statusCode: result.statusCode }));
        } else {
          console.error(JSON.stringify({ evt: "tick.error", sub: sub.id, label: sub.device_label, statusCode: result.statusCode, message: result.message }));
        }
      } catch (err) {
        console.error(JSON.stringify({ evt: "tick.exception", sub: sub.id, message: err instanceof Error ? err.message : String(err) }));
      }
    }

    if (matched === 0 && nowUtc.getSeconds() < 5) {
      // Lightweight heartbeat — one log per minute, but only when the minute rolls over.
      console.log(JSON.stringify({ evt: "tick.idle", enabled: subscriptions.filter(s => s.enabled).length }));
    }
  } finally {
    running = false;
  }
}

const DB_PATH = env.DATABASE_URL.replace("file:", "");
console.log(JSON.stringify({
  evt: "worker.boot",
  dbPath: DB_PATH,
  vapidSubject: maskSubject(env.VAPID_SUBJECT),
  vapidPublicKeyPrefix: env.VAPID_PUBLIC_KEY.slice(0, 8),
  prompts: getPromptCount(),
  subscriptions: listSubscriptions().length,
}));

cron.schedule("* * * * *", () => {
  tick().catch((err) => console.error(JSON.stringify({ evt: "tick.fatal", message: err instanceof Error ? err.message : String(err) })));
});
