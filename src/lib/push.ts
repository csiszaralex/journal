import webpush from "web-push";
import { disableSubscription, listSubscriptions } from "@/db/queries/subscriptions";
import { env } from "@/env";
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

const prompts: string[] = Array.isArray(promptsData) ? (promptsData as string[]) : [];

export function getPromptCount(): number {
  return prompts.length;
}

export function pickDailyPrompt(date: string): string {
  if (prompts.length === 0) return "Time to write in your journal.";
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return prompts[hash % prompts.length];
}
