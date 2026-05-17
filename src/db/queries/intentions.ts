import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { intentions } from "../schema";

export type IntentionStatus = "open" | "done" | "dropped";
export type Intention = typeof intentions.$inferSelect;

export function createIntention(input: {
  text: string;
  due_date?: string | null;
  entry_id?: string | null;
}): Intention {
  const id = createId();
  const now = Date.now();
  const row: Intention = {
    id,
    entry_id: input.entry_id ?? null,
    text: input.text,
    due_date: input.due_date ?? null,
    status: "open",
    completed_at: null,
    completed_in_entry_id: null,
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
  if (input.text !== undefined) patch.text = input.text;
  if (input.due_date !== undefined) patch.due_date = input.due_date;
  db.update(intentions)
    .set(patch)
    .where(and(eq(intentions.id, input.id), eq(intentions.status, "open")))
    .run();
}

export function completeIntention(input: {
  id: string;
  completed_in_entry_id?: string | null;
}): void {
  const now = Date.now();
  db.update(intentions)
    .set({
      status: "done",
      completed_at: now,
      completed_in_entry_id: input.completed_in_entry_id ?? null,
      updated_at: now,
    })
    .where(eq(intentions.id, input.id))
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
      completed_in_entry_id: null,
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

export function listIntentionsForEntry(entry_id: string): Intention[] {
  return db
    .select()
    .from(intentions)
    .where(eq(intentions.entry_id, entry_id))
    .orderBy(asc(intentions.created_at))
    .all();
}
