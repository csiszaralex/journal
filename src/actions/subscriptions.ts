'use server';

import { logAudit } from '@/db/queries/audit';
import {
  getSubscription,
  removeSubscription,
  updateSubscription,
} from '@/db/queries/subscriptions';
import { dictionaryFor } from '@/i18n/dictionary';
import { localeForSubscription, pickDailyPrompt, sendPush } from '@/lib/push';
import { authActionClient } from '@/lib/safe-action';
import { formatInTimeZone } from 'date-fns-tz';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const idSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  id: z.string().min(1),
  patch: z.object({
    device_label: z.string().optional(),
    timezone: z.string().optional(),
    notify_hour: z.number().int().min(0).max(23).optional(),
    notify_minute: z.number().int().min(0).max(59).optional(),
    enabled: z.number().int().min(0).max(1).optional(),
  }),
});

export type SendActionResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'gone' | 'error'; message?: string; statusCode?: number };

export const updateSubscriptionAction = authActionClient
  .inputSchema(patchSchema)
  .action(async ({ parsedInput }) => {
    updateSubscription(parsedInput.id, parsedInput.patch);
    logAudit('push.update', { subscription_id: parsedInput.id });
    revalidatePath('/settings/devices');
  });

export const deleteSubscriptionAction = authActionClient
  .inputSchema(idSchema)
  .action(async ({ parsedInput }) => {
    const sub = getSubscription(parsedInput.id);
    if (sub) removeSubscription(sub.endpoint);
    logAudit('push.delete', { subscription_id: parsedInput.id });
    revalidatePath('/settings/devices');
  });

export const sendTestNotificationAction = authActionClient
  .inputSchema(idSchema)
  .action(async ({ parsedInput }): Promise<SendActionResult> => {
    const sub = getSubscription(parsedInput.id);
    if (!sub) {
      logAudit('push.test.fail', { subscription_id: parsedInput.id, reason: 'not-found' });
      return { ok: false, reason: 'not-found' };
    }
    // Addressed to one device, so it speaks that device's language rather than
    // the one this browser happens to be using — the point of the button is to
    // show what will actually arrive there.
    const result = await sendPush(sub, {
      type: 'daily',
      title: 'Journal',
      body: dictionaryFor(localeForSubscription(sub.locale)).push.test,
    });
    if (result.status === 'sent') {
      logAudit('push.test.success', { subscription_id: parsedInput.id });
      return { ok: true };
    }
    if (result.status === 'gone') {
      logAudit('push.test.fail', {
        subscription_id: parsedInput.id,
        reason: 'gone',
        statusCode: result.statusCode,
      });
      return { ok: false, reason: 'gone', statusCode: result.statusCode };
    }
    logAudit('push.test.fail', {
      subscription_id: parsedInput.id,
      reason: 'error',
      statusCode: result.statusCode,
      message: result.message,
    });
    return { ok: false, reason: 'error', statusCode: result.statusCode, message: result.message };
  });

export const sendScheduledPreviewAction = authActionClient
  .inputSchema(idSchema)
  .action(async ({ parsedInput }): Promise<SendActionResult> => {
    const sub = getSubscription(parsedInput.id);
    if (!sub) {
      logAudit('push.preview.fail', { subscription_id: parsedInput.id, reason: 'not-found' });
      return { ok: false, reason: 'not-found' };
    }
    const todayStr = formatInTimeZone(new Date(), sub.timezone, 'yyyy-MM-dd');
    // Resolved exactly as the worker resolves it, so the preview is the message
    // the schedule would have sent rather than an approximation of it.
    const locale = localeForSubscription(sub.locale);
    const d = dictionaryFor(locale);
    const body = pickDailyPrompt(todayStr, locale) ?? d.push.noPrompts;
    const result = await sendPush(sub, { type: 'daily', title: 'Journal', body, date: todayStr });
    if (result.status === 'sent') {
      logAudit('push.preview.success', { subscription_id: parsedInput.id, date: todayStr });
      return { ok: true };
    }
    if (result.status === 'gone') {
      logAudit('push.preview.fail', {
        subscription_id: parsedInput.id,
        reason: 'gone',
        statusCode: result.statusCode,
      });
      return { ok: false, reason: 'gone', statusCode: result.statusCode };
    }
    logAudit('push.preview.fail', {
      subscription_id: parsedInput.id,
      reason: 'error',
      statusCode: result.statusCode,
      message: result.message,
    });
    return { ok: false, reason: 'error', statusCode: result.statusCode, message: result.message };
  });

export const toggleSubscriptionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1), enabled: z.boolean() }))
  .action(async ({ parsedInput }) => {
    updateSubscription(parsedInput.id, { enabled: parsedInput.enabled ? 1 : 0 });
    logAudit('push.toggle', { subscription_id: parsedInput.id, enabled: parsedInput.enabled });
    revalidatePath('/settings/devices');
  });

