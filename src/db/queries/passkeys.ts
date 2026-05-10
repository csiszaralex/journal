import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { authAuthenticators } from "../schema";

export type PasskeyRow = {
  credentialID: string;
  name: string | null;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  createdAt: Date | null;
};

export function listPasskeysForUser(userId: string): PasskeyRow[] {
  return db
    .select({
      credentialID: authAuthenticators.credentialID,
      name: authAuthenticators.name,
      credentialDeviceType: authAuthenticators.credentialDeviceType,
      credentialBackedUp: authAuthenticators.credentialBackedUp,
      createdAt: authAuthenticators.createdAt,
    })
    .from(authAuthenticators)
    .where(eq(authAuthenticators.userId, userId))
    .orderBy(desc(authAuthenticators.createdAt))
    .all();
}

export function countPasskeysForUser(userId: string): number {
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(authAuthenticators)
    .where(eq(authAuthenticators.userId, userId))
    .get();
  return row?.count ?? 0;
}

export function renamePasskey(
  credentialID: string,
  userId: string,
  name: string,
): boolean {
  const result = db
    .update(authAuthenticators)
    .set({ name })
    .where(
      and(
        eq(authAuthenticators.credentialID, credentialID),
        eq(authAuthenticators.userId, userId),
      ),
    )
    .run();
  return result.changes > 0;
}

export function deletePasskey(credentialID: string, userId: string): boolean {
  const result = db
    .delete(authAuthenticators)
    .where(
      and(
        eq(authAuthenticators.credentialID, credentialID),
        eq(authAuthenticators.userId, userId),
      ),
    )
    .run();
  return result.changes > 0;
}
