'use server';

import { logAudit } from '@/db/queries/audit';
import {
  getSubscription,
  listSubscriptions,
  removeSubscription,
  updateSubscription,
} from '@/db/queries/subscriptions';
import { sendPush, pickDailyPrompt } from '@/lib/push';
import { formatInTimeZone } from 'date-fns-tz';
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

export type SendActionResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'gone' | 'error'; message?: string; statusCode?: number };

export async function listSubscriptionsAction() {
  return listSubscriptions();
}

export async function updateSubscriptionAction(id: string, patch: z.infer<typeof patchSchema>) {
  const validId = idSchema.parse(id);
  const validPatch = patchSchema.parse(patch);
  updateSubscription(validId, validPatch);
  logAudit('push.update', { subscription_id: validId });
  revalidatePath('/settings/devices');
}

export async function deleteSubscriptionAction(id: string) {
  const validId = idSchema.parse(id);
  const sub = getSubscription(validId);
  if (sub) removeSubscription(sub.endpoint);
  logAudit('push.delete', { subscription_id: validId });
  revalidatePath('/settings/devices');
}

export async function sendTestNotificationAction(id: string): Promise<SendActionResult> {
  const validId = idSchema.parse(id);
  const sub = getSubscription(validId);
  if (!sub) {
    logAudit('push.test.fail', { subscription_id: validId, reason: 'not-found' });
    return { ok: false, reason: 'not-found' };
  }
  const result = await sendPush(sub, {
    title: 'Journal',
    body: 'Test notification — everything is working!',
  });
  if (result.status === 'sent') {
    logAudit('push.test.success', { subscription_id: validId });
    return { ok: true };
  }
  if (result.status === 'gone') {
    logAudit('push.test.fail', {
      subscription_id: validId,
      reason: 'gone',
      statusCode: result.statusCode,
    });
    return { ok: false, reason: 'gone', statusCode: result.statusCode };
  }
  logAudit('push.test.fail', {
    subscription_id: validId,
    reason: 'error',
    statusCode: result.statusCode,
    message: result.message,
  });
  return { ok: false, reason: 'error', statusCode: result.statusCode, message: result.message };
}

export async function sendScheduledPreviewAction(id: string): Promise<SendActionResult> {
  const validId = idSchema.parse(id);
  const sub = getSubscription(validId);
  if (!sub) {
    logAudit('push.preview.fail', { subscription_id: validId, reason: 'not-found' });
    return { ok: false, reason: 'not-found' };
  }
  const todayStr = formatInTimeZone(new Date(), sub.timezone, 'yyyy-MM-dd');
  const body = pickDailyPrompt(todayStr);
  const result = await sendPush(sub, { title: 'Journal', body });
  if (result.status === 'sent') {
    logAudit('push.preview.success', { subscription_id: validId, date: todayStr });
    return { ok: true };
  }
  if (result.status === 'gone') {
    logAudit('push.preview.fail', {
      subscription_id: validId,
      reason: 'gone',
      statusCode: result.statusCode,
    });
    return { ok: false, reason: 'gone', statusCode: result.statusCode };
  }
  logAudit('push.preview.fail', {
    subscription_id: validId,
    reason: 'error',
    statusCode: result.statusCode,
    message: result.message,
  });
  return { ok: false, reason: 'error', statusCode: result.statusCode, message: result.message };
}

export async function toggleSubscriptionAction(id: string, enabled: boolean) {
  const validId = idSchema.parse(id);
  const validEnabled = z.boolean().parse(enabled);
  updateSubscription(validId, { enabled: validEnabled ? 1 : 0 });
  logAudit('push.toggle', { subscription_id: validId, enabled: validEnabled });
  revalidatePath('/settings/devices');
}
