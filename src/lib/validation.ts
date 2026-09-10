import { entryTemplates, entryVersions, pushSubscriptions } from '@/db/schema';
import type { Dictionary } from '@/i18n/dictionary';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Why the message-bearing schemas are factories rather than module constants.
//
// A schema built at import time can carry only one language's messages, and
// this app has no single language to build with: the setting decides when one
// has been chosen, and `Accept-Language` decides when it has not, both per
// request. Zod's global locale config (`z.config(z.locales.hu())`) is exactly
// the wrong tool for that — it is process-wide and set once, so the first
// visitor's language would be served to the next one.
//
// So the dictionary is a parameter. `entryInputSchema` is used on both sides of
// the wire — the entry form validates with it before posting, POST /api/sync
// re-applies it on arrival — and each side builds its own from the dictionary
// it already has: `useI18n()` in the component, `await getDict()` on the server.
//
// The schemas with no custom message (the two push payloads) stay constants:
// their failures never reach a person, because the routes answer them with a
// message of their own.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function scoreField(d: Dictionary) {
  return z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z
      .number()
      .int()
      .min(1, d.errors.validation.scoreRange)
      .max(5, d.errors.validation.scoreRange)
      .optional(),
  );
}

/** The entry payload without the period rule — what the sync route extends
 *  before re-applying `refineEntryPeriod`. */
export function makeEntryInputObjectSchema(d: Dictionary) {
  return createInsertSchema(entryVersions, {
    entry_date: (s) => s.regex(ISO_DAY, d.errors.validation.dateFormat),
    // No message: 100 000 characters is past anything a person types into the
    // box, so the built-in one is for a broken client, not for a reader.
    text: (s) => s.max(100000),
    mood_score: scoreField(d),
    energy_score: scoreField(d),
  })
    .pick({
      entry_date: true,
      text: true,
      mood_score: true,
      energy_score: true,
    })
    .extend({
      tags: z.string().default('[]'),
      emotions: z.string().default('[]'),
      kind: z.enum(['daily', 'summary']).optional(),
      period_start: z.preprocess(
        (v) => (v === '' || v === null ? undefined : v),
        z.string().regex(ISO_DAY, d.errors.validation.dateFormat).optional(),
      ),
    });
}

/**
 * A summary spans period_start..entry_date; a daily entry has no period.
 * Shared so the sync route can re-apply it after .extend().
 *
 * Curried on the dictionary so the result is still the plain refiner
 * `.superRefine()` wants: `.superRefine(refineEntryPeriod(d))`.
 */
export function refineEntryPeriod(d: Dictionary) {
  return function (
    val: { kind?: 'daily' | 'summary'; entry_date: string; period_start?: string },
    ctx: z.RefinementCtx,
  ): void {
    const kind = val.kind ?? 'daily';
    if (kind === 'summary') {
      if (!val.period_start) {
        ctx.addIssue({
          code: 'custom',
          path: ['period_start'],
          message: d.errors.validation.summaryNeedsStart,
        });
        return;
      }
      if (val.period_start > val.entry_date) {
        ctx.addIssue({
          code: 'custom',
          path: ['period_start'],
          message: d.errors.validation.startAfterEnd,
        });
      }
    } else if (val.period_start) {
      ctx.addIssue({
        code: 'custom',
        path: ['period_start'],
        message: d.errors.validation.dailyHasNoPeriod,
      });
    }
  };
}

export function makeEntryInputSchema(d: Dictionary) {
  return makeEntryInputObjectSchema(d).superRefine(refineEntryPeriod(d));
}

/** The parsed entry payload. Derived from the factory's return type, so it does
 *  not depend on which language built the schema. */
export type EntryInput = z.infer<ReturnType<typeof makeEntryInputSchema>>;

export const pushSubscribeSchema = createInsertSchema(pushSubscriptions, {
  endpoint: (s) => s.url(),
})
  .pick({
    endpoint: true,
    timezone: true,
  })
  .extend({
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  });

export const pushUnsubscribeSchema = pushSubscribeSchema.pick({ endpoint: true });

export function makeTemplateSchema(d: Dictionary) {
  return createInsertSchema(entryTemplates, {
    name: (s) =>
      s
        .min(1, d.errors.validation.templateNameRequired)
        .max(60, d.errors.validation.templateNameTooLong),
    // No message, for the same reason as an entry's text: the editor's textarea
    // is not where a 10 000-character overrun comes from.
    text: (s) => s.max(10000),
    default_mood: scoreField(d),
    default_energy: scoreField(d),
  }).omit({
    id: true,
    created_at: true,
  });
}
