"use server";

import { searchEntries, listEntries } from "@/db/queries/entries";
import { authActionClient } from "@/lib/safe-action";
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

export const searchEntriesAction = authActionClient
  .inputSchema(searchParamsSchema)
  .action(async ({ parsedInput }) => {
    const { q, from, to, moodMin, moodMax, page = 1 } = parsedInput;

    // One set of controls on the page, so both branches take the same filters.
    const common = {
      from_date: from || undefined,
      to_date: to || undefined,
      min_mood: moodMin,
      max_mood: moodMax,
      page,
      page_size: 25,
    };

    if (q?.trim()) {
      return searchEntries(q.trim(), common);
    }

    return listEntries(common);
  });
