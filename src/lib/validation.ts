import { entryTemplates, entryVersions, pushSubscriptions } from '@/db/schema';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

const scoreField = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().min(1).max(5).optional(),
);

export const entryVersionInsertSchema = createInsertSchema(entryVersions, {
  entry_date: (s) => s.regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  text: (s) => s.max(100000),
  mood_score: scoreField,
  energy_score: scoreField,
});

export const entryInputSchema = entryVersionInsertSchema
  .pick({
    entry_date: true,
    text: true,
    mood_score: true,
    energy_score: true,
  })
  .extend({
    tags: z.string().default('[]'),
    emotions: z.string().default('[]'),
  });

export type EntryInput = z.infer<typeof entryInputSchema>;

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

export const templateSchema = createInsertSchema(entryTemplates, {
  name: (s) => s.min(1).max(60),
  text: (s) => s.max(10000),
  default_mood: scoreField,
  default_energy: scoreField,
}).omit({
  id: true,
  created_at: true,
});

