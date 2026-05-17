import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { emotions, entries, entryVersionEmotions } from "../schema";
import { randomTagColor } from "@/lib/color";

export class EmotionNameConflictError extends Error {
  constructor(public existingDisplayName: string) {
    super("EMOTION_NAME_CONFLICT");
    this.name = "EmotionNameConflictError";
  }
}

export function getOrCreateEmotion(displayName: string) {
  const name = displayName.trim().toLowerCase();
  if (!name) throw new Error("Emotion name cannot be empty");

  const existing = db
    .select()
    .from(emotions)
    .where(eq(emotions.name, name))
    .get();

  if (existing) return existing;

  const id = createId();
  const now = Date.now();

  db.insert(emotions)
    .values({
      id,
      name,
      display_name: displayName.trim(),
      color: randomTagColor(),
      created_at: now,
    })
    .run();

  return db.select().from(emotions).where(eq(emotions.id, id)).get()!;
}

export function suggestEmotions(prefix: string, limit = 10) {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) return getPopularEmotions(limit);

  return db
    .select()
    .from(emotions)
    .where(
      or(
        like(emotions.name, `${normalized}%`),
        like(emotions.name, `%${normalized}%`)
      )
    )
    .orderBy(desc(emotions.usage_count))
    .limit(limit)
    .all();
}

export function getPopularEmotions(limit = 20) {
  return db
    .select()
    .from(emotions)
    .orderBy(desc(emotions.usage_count))
    .limit(limit)
    .all();
}

export function listAllEmotions() {
  return db
    .select({
      id: emotions.id,
      name: emotions.name,
      display_name: emotions.display_name,
      color: emotions.color,
      created_at: emotions.created_at,
      usage_count: sql<number>`COUNT(DISTINCT CASE WHEN ${entries.deleted_at} IS NULL THEN ${entries.id} END)`,
    })
    .from(emotions)
    .leftJoin(entryVersionEmotions, eq(entryVersionEmotions.emotion_id, emotions.id))
    .leftJoin(entries, eq(entries.current_version_id, entryVersionEmotions.version_id))
    .groupBy(emotions.id)
    .orderBy(asc(emotions.name))
    .all();
}

export function updateEmotion(input: {
  id: string;
  display_name: string;
  name: string;
  color: string;
}) {
  const newName = input.name.trim().toLowerCase();
  const newDisplay = input.display_name.trim();
  if (!newName) throw new Error("Emotion name cannot be empty");
  if (!newDisplay) throw new Error("Emotion display name cannot be empty");

  const conflict = db
    .select({ id: emotions.id, display_name: emotions.display_name })
    .from(emotions)
    .where(and(eq(emotions.name, newName), ne(emotions.id, input.id)))
    .get();
  if (conflict) throw new EmotionNameConflictError(conflict.display_name);

  db.update(emotions)
    .set({ name: newName, display_name: newDisplay, color: input.color })
    .where(eq(emotions.id, input.id))
    .run();

  return db.select().from(emotions).where(eq(emotions.id, input.id)).get()!;
}

export function deleteEmotion(id: string) {
  db.transaction((tx) => {
    tx.delete(entryVersionEmotions).where(eq(entryVersionEmotions.emotion_id, id)).run();
    tx.delete(emotions).where(eq(emotions.id, id)).run();
  });
}

export function recomputeEmotionUsageCounts() {
  const counts = db
    .all(
      sql`
        SELECT em.id, COUNT(eve.emotion_id) AS cnt
        FROM emotions em
        LEFT JOIN entry_version_emotions eve ON eve.emotion_id = em.id
        LEFT JOIN entries e ON e.current_version_id = eve.version_id
        WHERE e.deleted_at IS NULL OR e.id IS NULL
        GROUP BY em.id
      `
    )
    .map((row) => z.object({ id: z.string(), cnt: z.number() }).parse(row));

  db.transaction((tx) => {
    for (const { id, cnt } of counts) {
      tx.update(emotions)
        .set({ usage_count: cnt })
        .where(eq(emotions.id, id))
        .run();
    }
  });
}
