import { and, asc, desc, eq, like, ne, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { entries, entryVersionTags, tags } from "../schema";
import { randomTagColor } from "@/lib/color";

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

export function suggestTags(prefix: string, limit = 10) {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) return getPopularTags(limit);

  return db
    .select()
    .from(tags)
    .where(like(tags.name, `%${normalized}%`))
    .orderBy(desc(tags.usage_count))
    .limit(limit)
    .all();
}

export function getPopularTags(limit = 20) {
  return db
    .select()
    .from(tags)
    .orderBy(desc(tags.usage_count))
    .limit(limit)
    .all();
}

export function listAllTags() {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      display_name: tags.display_name,
      color: tags.color,
      created_at: tags.created_at,
      usage_count: sql<number>`COUNT(DISTINCT CASE WHEN ${entries.deleted_at} IS NULL THEN ${entries.id} END)`,
    })
    .from(tags)
    .leftJoin(entryVersionTags, eq(entryVersionTags.tag_id, tags.id))
    .leftJoin(entries, eq(entries.current_version_id, entryVersionTags.version_id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name))
    .all();
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
