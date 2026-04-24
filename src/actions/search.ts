"use server";

import { searchEntries, listEntries } from "@/db/queries/entries";
import { z } from "zod";

const searchParamsSchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  moodMin: z.number().optional(),
  moodMax: z.number().optional(),
  page: z.number().optional(),
});

export type SearchActionParams = z.infer<typeof searchParamsSchema>;

export async function searchEntriesAction(params: SearchActionParams) {
  const validParams = searchParamsSchema.parse(params);
  const { q, from, to, moodMin, moodMax, page = 1 } = validParams;

  if (q?.trim()) {
    return searchEntries(q.trim(), 25);
  }

  return listEntries({
    from_date: from || undefined,
    to_date: to || undefined,
    min_mood: moodMin,
    max_mood: moodMax,
    page,
    page_size: 25,
  });
}
