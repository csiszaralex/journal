"use server";

import {
  updateSubscription,
  removeSubscription,
  listSubscriptions,
  getSubscription,
} from "@/db/queries/subscriptions";
import { sendPush } from "@/lib/push";
import { logAudit } from "@/db/queries/audit";
import { revalidatePath } from "next/cache";

export async function listSubscriptionsAction() {
  return listSubscriptions();
}

export async function updateSubscriptionAction(
  id: string,
  patch: Partial<{
    device_label: string;
    timezone: string;
    notify_hour: number;
    notify_minute: number;
    enabled: number;
  }>
) {
  updateSubscription(id, patch);
  logAudit("push.update", { subscription_id: id });
  revalidatePath("/devices");
}

export async function deleteSubscriptionAction(id: string) {
  const sub = getSubscription(id);
  if (sub) removeSubscription(sub.endpoint);
  logAudit("push.delete", { subscription_id: id });
  revalidatePath("/devices");
}

export async function sendTestNotificationAction(id: string) {
  const sub = getSubscription(id);
  if (!sub) return;
  await sendPush(sub, {
    title: "Journal",
    body: "Test notification — everything is working!",
  });
  logAudit("push.test", { subscription_id: id });
}

export async function toggleSubscriptionAction(id: string, enabled: boolean) {
  updateSubscription(id, { enabled: enabled ? 1 : 0 });
  logAudit("push.toggle", { subscription_id: id, enabled });
  revalidatePath("/devices");
}
