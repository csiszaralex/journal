import { asc, eq, max } from 'drizzle-orm';
import { db } from '../client';
import { appSettings, userProfileQa } from '../schema';

const PROFILE_BIO_KEY = 'user_profile_bio';

export function getProfileBio(): string {
  const row = db.select().from(appSettings).where(eq(appSettings.key, PROFILE_BIO_KEY)).get();
  return row?.value ?? '';
}

export function setProfileBio(bio: string): void {
  db.insert(appSettings)
    .values({ key: PROFILE_BIO_KEY, value: bio })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: bio } })
    .run();
}

export type ProfileQaItem = {
  id: number;
  question: string;
  answer: string | null;
  position: number;
  created_at: number;
};

export function listProfileQa(): ProfileQaItem[] {
  return db.select().from(userProfileQa).orderBy(asc(userProfileQa.position)).all();
}

export function insertProfileQaItems(questions: string[]): void {
  if (questions.length === 0) return;
  const maxRow = db
    .select({ maxPos: max(userProfileQa.position) })
    .from(userProfileQa)
    .get();
  const startPos = (maxRow?.maxPos ?? -1) + 1;
  const now = Date.now();
  db.insert(userProfileQa)
    .values(
      questions.map((q, i) => ({
        question: q,
        answer: null,
        position: startPos + i,
        created_at: now,
      })),
    )
    .run();
}

export function updateProfileQaAnswer(id: number, answer: string): void {
  db.update(userProfileQa).set({ answer }).where(eq(userProfileQa.id, id)).run();
}

export function deleteProfileQaItem(id: number): void {
  db.delete(userProfileQa).where(eq(userProfileQa.id, id)).run();
}

