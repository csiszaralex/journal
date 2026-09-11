import webpush from "web-push";
import { disableSubscription, listSubscriptions } from "@/db/queries/subscriptions";
import { env } from "@/env";
import type { Locale } from "@/i18n/locales";
import promptsData from "../../data/prompts.json";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
}

export type PushPayload =
  | { type: "daily"; title: string; body: string; date?: string }
  | { type: "close"; date: string };

export type SendPushResult =
  | { status: "sent" }
  | { status: "gone"; statusCode: number }
  | { status: "error"; statusCode?: number; message: string };

export async function sendPush(
  subscription: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<SendPushResult> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return { status: "sent" };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err && typeof err.statusCode === "number"
        ? err.statusCode
        : undefined;
    if (statusCode === 410 || statusCode === 404) {
      disableSubscription(subscription.id);
      return { status: "gone", statusCode };
    }
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown push error";
    return { status: "error", statusCode, message };
  }
}

export async function dismissNotificationsForDate(date: string): Promise<void> {
  const subscriptions = listSubscriptions();
  await Promise.allSettled(
    subscriptions
      .filter((sub) => !!sub.enabled)
      .map((sub) => sendPush(sub, { type: "close", date }))
  );
}

const prompts = promptsData as Record<Locale, readonly string[]>;

export function getPromptCount(locale: Locale): number {
  return prompts[locale]?.length ?? 0;
}

/**
 * The prompt for a given day, or null when there is nothing to pick from.
 *
 * The index is hashed from the date alone, never from the language, and the two
 * lists in `data/prompts.json` are the same length and index-aligned. So a day
 * asks the same question whichever language is set — switching languages
 * translates the evening's prompt rather than replacing it with an unrelated
 * one, and re-reading an old notification still makes sense against the entry
 * it produced.
 *
 * Returns null rather than a fallback sentence so the copy stays in the
 * dictionary with the rest of it; both callers substitute `push.noPrompts`.
 */
export function pickDailyPrompt(date: string, locale: Locale): string | null {
  const pool = prompts[locale] ?? [];
  if (pool.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}
