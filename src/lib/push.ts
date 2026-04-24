import webpush from "web-push";
import { readFileSync } from "fs";
import { join } from "path";
import { disableSubscription } from "@/db/queries/subscriptions";
import { env } from "@/env";

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

export async function sendPush(
  subscription: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string }
): Promise<void> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      disableSubscription(subscription.id);
    } else {
      throw err;
    }
  }
}

let _prompts: string[] | null = null;

function loadPrompts(): string[] {
  if (!_prompts) {
    const path = join(process.cwd(), "data", "prompts.json");
    _prompts = JSON.parse(readFileSync(path, "utf-8")) as string[];
  }
  return _prompts;
}

export function pickDailyPrompt(date: string): string {
  const prompts = loadPrompts();
  // Deterministic: hash the date string into an index
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return prompts[hash % prompts.length];
}
