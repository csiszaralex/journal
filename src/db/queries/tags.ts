import { desc, eq, like, or, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { tags, entryVersionTags } from "../schema";

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
    .values({ id, name, display_name: displayName.trim(), created_at: now })
    .run();

  return db.select().from(tags).where(eq(tags.id, id)).get()!;
}

export function suggestTags(prefix: string, limit = 10) {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) return getPopularTags(limit);

  return db
    .select()
    .from(tags)
    .where(
      or(
        like(tags.name, `${normalized}%`),
        like(tags.name, `%${normalized}%`)
      )
    )
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

export function recomputeUsageCounts() {
  const counts = db
    .all(
      sql`
        SELECT t.id, COUNT(evt.tag_id) AS cnt
        FROM tags t
        LEFT JOIN entry_version_tags evt ON evt.tag_id = t.id
        LEFT JOIN entries e ON e.current_version_id = evt.version_id
        WHERE e.deleted_at IS NULL OR e.id IS NULL
        GROUP BY t.id
      `
    )
    .map((row) => row as { id: string; cnt: number });

  db.transaction((tx) => {
    for (const { id, cnt } of counts) {
      tx.update(tags)
        .set({ usage_count: cnt })
        .where(eq(tags.id, id))
        .run();
    }
  });
}
