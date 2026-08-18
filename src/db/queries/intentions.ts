import { and, asc, desc, eq, gte, isNotNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { intentions, intentionCategoryColors } from "../schema";
import { parseCategory } from "@/lib/intentions";

export type IntentionStatus = "open" | "done" | "dropped";
export type Intention = typeof intentions.$inferSelect;

export function createIntention(input: {
  text: string;
  due_date?: string | null;
}): Intention {
  const id = createId();
  const now = Date.now();
  const { category, text } = parseCategory(input.text);
  const row: Intention = {
    id,
    text,
    category,
    due_date: input.due_date ?? null,
    status: "open",
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  db.insert(intentions).values(row).run();
  return row;
}

export function updateIntention(input: {
  id: string;
  text?: string;
  due_date?: string | null;
}): void {
  const patch: Record<string, unknown> = { updated_at: Date.now() };
  if (input.text !== undefined) {
    const { category, text } = parseCategory(input.text);
    patch.text = text;
    patch.category = category;
  }
  if (input.due_date !== undefined) patch.due_date = input.due_date;
  db.update(intentions)
    .set(patch)
    .where(and(eq(intentions.id, input.id), eq(intentions.status, "open")))
    .run();
}

export function completeIntention(id: string): void {
  const now = Date.now();
  db.update(intentions)
    .set({
      status: "done",
      completed_at: now,
      updated_at: now,
    })
    .where(eq(intentions.id, id))
    .run();
}

export function dropIntention(id: string): void {
  const now = Date.now();
  db.update(intentions)
    .set({ status: "dropped", completed_at: now, updated_at: now })
    .where(eq(intentions.id, id))
    .run();
}

export function reopenIntention(id: string): void {
  const now = Date.now();
  db.update(intentions)
    .set({
      status: "open",
      completed_at: null,
      updated_at: now,
    })
    .where(eq(intentions.id, id))
    .run();
}

export function deleteIntention(id: string): void {
  db.delete(intentions).where(eq(intentions.id, id)).run();
}

export function listOpenIntentionsForToday(todayISO: string): Intention[] {
  return db
    .select()
    .from(intentions)
    .where(
      and(eq(intentions.status, "open"), lte(intentions.due_date, todayISO))
    )
    .orderBy(asc(intentions.due_date), asc(intentions.created_at))
    .all();
}

export function countOpenIntentionsForToday(todayISO: string): number {
  const row = db
    .select({ c: sql<number>`count(*)` })
    .from(intentions)
    .where(
      and(eq(intentions.status, "open"), lte(intentions.due_date, todayISO))
    )
    .get();
  return row?.c ?? 0;
}

export function listAllOpenIntentions(todayISO: string): Intention[] {
  return db
    .select()
    .from(intentions)
    .where(eq(intentions.status, "open"))
    .orderBy(
      sql`CASE
        WHEN ${intentions.due_date} IS NULL THEN 3
        WHEN ${intentions.due_date} < ${todayISO} THEN 0
        WHEN ${intentions.due_date} = ${todayISO} THEN 1
        ELSE 2
      END`,
      asc(intentions.due_date),
      desc(intentions.created_at)
    )
    .all();
}

export function listRecentlyClosed(days: number): Intention[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return db
    .select()
    .from(intentions)
    .where(
      and(ne(intentions.status, "open"), gte(intentions.completed_at, cutoff))
    )
    .orderBy(desc(intentions.completed_at))
    .all();
}

export function listDistinctCategories(): string[] {
  return distinctCategories(true);
}

/** All categories ever used (any status) — for the settings color editor. */
export function listAllDistinctCategories(): string[] {
  return distinctCategories(false);
}

function distinctCategories(openOnly: boolean): string[] {
  const where = openOnly
    ? and(eq(intentions.status, "open"), isNotNull(intentions.category))
    : isNotNull(intentions.category);
  const rows = db
    .selectDistinct({ category: intentions.category })
    .from(intentions)
    .where(where)
    .orderBy(asc(intentions.category))
    .all();
  return rows
    .map((r) => r.category)
    .filter((c): c is string => c !== null);
}

/** Map of category name → user-chosen color override (no defaults included). */
export function getCategoryColorMap(): Record<string, string> {
  const rows = db.select().from(intentionCategoryColors).all();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.name] = r.color;
  return map;
}

export function setCategoryColor(name: string, color: string): void {
  db.insert(intentionCategoryColors)
    .values({ name, color })
    .onConflictDoUpdate({
      target: intentionCategoryColors.name,
      set: { color },
    })
    .run();
}

export function deleteCategoryColor(name: string): void {
  db.delete(intentionCategoryColors)
    .where(eq(intentionCategoryColors.name, name))
    .run();
}

/**
 * Intentions relevant to a summary period: everything due inside it (any
 * status), plus anything still open that was already overdue when it began.
 */
export function listIntentionsForPeriod(from: string, to: string): Intention[] {
  return db
    .select()
    .from(intentions)
    .where(
      or(
        and(gte(intentions.due_date, from), lte(intentions.due_date, to)),
        and(eq(intentions.status, "open"), lt(intentions.due_date, from)),
      ),
    )
    .orderBy(intentions.due_date)
    .limit(20)
    .all();
}
