import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { pushSubscriptions, notificationsSent } from "../schema";

export type CreateSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label?: string;
  user_agent?: string;
  timezone?: string;
  notify_hour?: number;
  notify_minute?: number;
};

export function upsertSubscription(input: CreateSubscriptionInput) {
  const now = Date.now();

  const existing = db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .get();

  if (existing) {
    db.update(pushSubscriptions)
      .set({ p256dh: input.p256dh, auth: input.auth, last_seen_at: now })
      .where(eq(pushSubscriptions.id, existing.id))
      .run();
    return existing.id;
  }

  const id = createId();
  db.insert(pushSubscriptions)
    .values({
      id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      device_label: input.device_label ?? "Unknown device",
      user_agent: input.user_agent ?? null,
      timezone: input.timezone ?? "Europe/Budapest",
      notify_hour: input.notify_hour ?? 21,
      notify_minute: input.notify_minute ?? 0,
      created_at: now,
      last_seen_at: now,
    })
    .run();

  return id;
}

export function removeSubscription(endpoint: string) {
  db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .run();
}

export function listSubscriptions() {
  return db.select().from(pushSubscriptions).all();
}

export function getSubscription(id: string) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.id, id))
    .get();
}

export function updateSubscription(
  id: string,
  patch: Partial<{
    device_label: string;
    timezone: string;
    notify_hour: number;
    notify_minute: number;
    enabled: number;
  }>
) {
  db.update(pushSubscriptions).set(patch).where(eq(pushSubscriptions.id, id)).run();
}

export function disableSubscription(id: string) {
  db.update(pushSubscriptions)
    .set({ enabled: 0 })
    .where(eq(pushSubscriptions.id, id))
    .run();
}

export function hasNotificationBeenSent(subscriptionId: string, date: string) {
  return !!db
    .select()
    .from(notificationsSent)
    .where(
      and(
        eq(notificationsSent.subscription_id, subscriptionId),
        eq(notificationsSent.date, date)
      )
    )
    .get();
}

export function recordNotificationSent(subscriptionId: string, date: string) {
  db.insert(notificationsSent)
    .values({
      subscription_id: subscriptionId,
      date,
      sent_at: Date.now(),
    })
    .onConflictDoNothing()
    .run();
}
