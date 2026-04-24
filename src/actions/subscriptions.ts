'use server';

import { logAudit } from '@/db/queries/audit';
import {
  getSubscription,
  listSubscriptions,
  removeSubscription,
  updateSubscription,
} from '@/db/queries/subscriptions';
import { sendPush } from '@/lib/push';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const idSchema = z.string().min(1);

const patchSchema = z.object({
  device_label: z.string().optional(),
  timezone: z.string().optional(),
  notify_hour: z.number().int().min(0).max(23).optional(),
  notify_minute: z.number().int().min(0).max(59).optional(),
  enabled: z.number().int().min(0).max(1).optional(),
});

export async function listSubscriptionsAction() {
  return listSubscriptions();
}

export async function updateSubscriptionAction(id: string, patch: z.infer<typeof patchSchema>) {
  const validId = idSchema.parse(id);
  const validPatch = patchSchema.parse(patch);
  updateSubscription(validId, validPatch);
  logAudit('push.update', { subscription_id: validId });
  revalidatePath('/devices');
}

export async function deleteSubscriptionAction(id: string) {
  const validId = idSchema.parse(id);
  const sub = getSubscription(validId);
  if (sub) removeSubscription(sub.endpoint);
  logAudit('push.delete', { subscription_id: validId });
  revalidatePath('/devices');
}

export async function sendTestNotificationAction(id: string) {
  const validId = idSchema.parse(id);
  const sub = getSubscription(validId);
  if (!sub) return;
  await sendPush(sub, {
    title: 'Journal',
    body: 'Test notification — everything is working!',
  });
  logAudit('push.test', { subscription_id: validId });
}

export async function toggleSubscriptionAction(id: string, enabled: boolean) {
  const validId = idSchema.parse(id);
  const validEnabled = z.boolean().parse(enabled);
  updateSubscription(validId, { enabled: validEnabled ? 1 : 0 });
  logAudit('push.toggle', { subscription_id: validId, enabled: validEnabled });
  revalidatePath('/devices');
}

