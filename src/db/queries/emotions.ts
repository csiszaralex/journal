import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { emotions, entries, entryVersionEmotions } from "../schema";
import { randomTagColor } from "@/lib/color";
import { foldAccents } from "@/lib/text";

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

/**
 * Live usage count: distinct non-deleted entries whose *current* version links
 * the emotion. There is no stored counter on `emotions`; every "popular"/usage
 * ordering goes through this expression.
 */
const liveUsageCount = sql<number>`COUNT(DISTINCT CASE WHEN ${entries.deleted_at} IS NULL THEN ${entries.id} END)`;

/** Base select: every emotion row (same shape as `select().from(emotions)`) with a live `usage_count`. */
function emotionsWithUsage() {
  return db
    .select({
      id: emotions.id,
      name: emotions.name,
      display_name: emotions.display_name,
      color: emotions.color,
      emoji: emotions.emoji,
      created_at: emotions.created_at,
      usage_count: liveUsageCount,
    })
    .from(emotions)
    .leftJoin(entryVersionEmotions, eq(entryVersionEmotions.emotion_id, emotions.id))
    .leftJoin(entries, eq(entries.current_version_id, entryVersionEmotions.version_id))
    .groupBy(emotions.id);
}

/** All emotions (or the top `limit`) ordered by live usage desc, then name asc. */
export function listEmotionsByUsage(limit?: number) {
  const query = emotionsWithUsage().orderBy(desc(liveUsageCount), asc(emotions.name));
  return (limit === undefined ? query : query.limit(limit)).all();
}

export function suggestEmotions(prefix: string, limit = 10) {
  const needle = foldAccents(prefix.trim().toLowerCase());
  if (!needle) return getPopularEmotions(limit);

  return listEmotionsByUsage()
    .filter((e) => foldAccents(e.name).includes(needle))
    .slice(0, limit);
}

/**
 * Look up several emotions at once by their (display) names — used to resolve
 * colors/emojis for items restored from a draft in a single round trip, since
 * Next.js runs server actions sequentially and per-item calls add up.
 */
export function getEmotionsByNames(displayNames: string[]) {
  const names = Array.from(
    new Set(displayNames.map((n) => n.trim().toLowerCase()).filter(Boolean)),
  );
  if (names.length === 0) return [];
  return db.select().from(emotions).where(inArray(emotions.name, names)).all();
}

export function getPopularEmotions(limit = 20) {
  return listEmotionsByUsage(limit);
}

export function listAllEmotions() {
  return emotionsWithUsage().orderBy(asc(emotions.name)).all();
}

export function updateEmotion(input: {
  id: string;
  display_name: string;
  name: string;
  color: string;
  emoji: string | null;
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

  const emoji = input.emoji?.trim() || null;

  db.update(emotions)
    .set({ name: newName, display_name: newDisplay, color: input.color, emoji })
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
