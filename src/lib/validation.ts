import { z } from "zod";

const scoreField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().min(1).max(5).optional()
);

export const entryInputSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  text: z.string().max(100000).default(""),
  mood_score: scoreField,
  energy_score: scoreField,
  tags: z.string().default("[]"),
});

export type EntryInput = z.infer<typeof entryInputSchema>;
