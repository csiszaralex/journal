"use server";

import { suggestTags, getPopularTags } from "@/db/queries/tags";

export async function suggestTagsAction(prefix: string) {
  return suggestTags(prefix, 10);
}

export async function getPopularTagsAction() {
  return getPopularTags(10);
}
