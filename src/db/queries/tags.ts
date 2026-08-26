import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { entries, entryVersionTags, tags } from "../schema";
import { randomTagColor } from "@/lib/color";
import { foldAccents } from "@/lib/text";

export class TagNameConflictError extends Error {
  constructor(public existingDisplayName: string) {
    super("TAG_NAME_CONFLICT");
    this.name = "TagNameConflictError";
  }
}

export function getOrCreateTag(displayName: string) {
  const name = displayName.trim().toLowerCase();
  if (!name) throw new Error("Tag name cannot be empty");

  const existing = db
    .select()
    .from(tags)
    .where(eq(tags.name, name))
    .get();

  if (existing) return existing;

  const id = createId();
  const now = Date.now();

  db.insert(tags)
    .values({
      id,
      name,
      display_name: displayName.trim(),
      color: randomTagColor(),
      created_at: now,
    })
    .run();

  return db.select().from(tags).where(eq(tags.id, id)).get()!;
}

/**
 * Live usage count: distinct non-deleted entries whose *current* version links
 * the tag. There is no stored counter on `tags`; every "popular"/usage ordering
 * goes through this expression.
 */
const liveUsageCount = sql<number>`COUNT(DISTINCT CASE WHEN ${entries.deleted_at} IS NULL THEN ${entries.id} END)`;

/** Base select: every tag row (same shape as `select().from(tags)`) with a live `usage_count`. */
function tagsWithUsage() {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      display_name: tags.display_name,
      color: tags.color,
      created_at: tags.created_at,
      usage_count: liveUsageCount,
    })
    .from(tags)
    .leftJoin(entryVersionTags, eq(entryVersionTags.tag_id, tags.id))
    .leftJoin(entries, eq(entries.current_version_id, entryVersionTags.version_id))
    .groupBy(tags.id);
}

/** All tags (or the top `limit`) ordered by live usage desc, then name asc. */
export function listTagsByUsage(limit?: number) {
  const query = tagsWithUsage().orderBy(desc(liveUsageCount), asc(tags.name));
  return (limit === undefined ? query : query.limit(limit)).all();
}

export function suggestTags(prefix: string, limit = 10) {
  const needle = foldAccents(prefix.trim().toLowerCase());
  if (!needle) return getPopularTags(limit);

  return listTagsByUsage()
    .filter((t) => foldAccents(t.name).includes(needle))
    .slice(0, limit);
}

/**
 * Look up several tags at once by their (display) names — used to resolve
 * colors for items restored from a draft in a single round trip, since Next.js
 * runs server actions sequentially and per-item calls add up.
 */
export function getTagsByNames(displayNames: string[]) {
  const names = Array.from(
    new Set(displayNames.map((n) => n.trim().toLowerCase()).filter(Boolean)),
  );
  if (names.length === 0) return [];
  return db.select().from(tags).where(inArray(tags.name, names)).all();
}

export function getPopularTags(limit = 20) {
  return listTagsByUsage(limit);
}

export function listAllTags() {
  return tagsWithUsage().orderBy(asc(tags.name)).all();
}

export function updateTag(input: {
  id: string;
  display_name: string;
  name: string;
  color: string;
}) {
  const newName = input.name.trim().toLowerCase();
  const newDisplay = input.display_name.trim();
  if (!newName) throw new Error("Tag name cannot be empty");
  if (!newDisplay) throw new Error("Tag display name cannot be empty");

  const conflict = db
    .select({ id: tags.id, display_name: tags.display_name })
    .from(tags)
    .where(and(eq(tags.name, newName), ne(tags.id, input.id)))
    .get();
  if (conflict) throw new TagNameConflictError(conflict.display_name);

  db.update(tags)
    .set({ name: newName, display_name: newDisplay, color: input.color })
    .where(eq(tags.id, input.id))
    .run();

  return db.select().from(tags).where(eq(tags.id, input.id)).get()!;
}

export function deleteTag(id: string) {
  db.transaction((tx) => {
    tx.delete(entryVersionTags).where(eq(entryVersionTags.tag_id, id)).run();
    tx.delete(tags).where(eq(tags.id, id)).run();
  });
}
