"use server";

import { searchEntries, listEntries } from "@/db/queries/entries";

export type SearchActionParams = {
  q?: string;
  from?: string;
  to?: string;
  moodMin?: number;
  moodMax?: number;
  page?: number;
};

export async function searchEntriesAction(params: SearchActionParams) {
  const { q, from, to, moodMin, moodMax, page = 1 } = params;

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
