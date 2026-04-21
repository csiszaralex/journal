import { createId } from '@paralleldrive/cuid2';
import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { entryTemplates } from '../schema';

export type EntryTemplate = typeof entryTemplates.$inferSelect;

export function listTemplates(): EntryTemplate[] {
  return db.select().from(entryTemplates).orderBy(asc(entryTemplates.created_at)).all();
}

export function createTemplate(input: {
  name: string;
  text: string;
  default_mood?: number | null;
  default_energy?: number | null;
}): EntryTemplate {
  const id = createId();
  const now = Date.now();
  db.insert(entryTemplates)
    .values({
      id,
      name: input.name,
      text: input.text,
      default_mood: input.default_mood ?? null,
      default_energy: input.default_energy ?? null,
      created_at: now,
    })
    .run();
  return db.select().from(entryTemplates).where(eq(entryTemplates.id, id)).get()!;
}

export function updateTemplate(
  id: string,
  input: {
    name: string;
    text: string;
    default_mood?: number | null;
    default_energy?: number | null;
  },
): void {
  db.update(entryTemplates)
    .set({
      name: input.name,
      text: input.text,
      default_mood: input.default_mood ?? null,
      default_energy: input.default_energy ?? null,
    })
    .where(eq(entryTemplates.id, id))
    .run();
}

export function deleteTemplate(id: string): void {
  db.delete(entryTemplates).where(eq(entryTemplates.id, id)).run();
}
