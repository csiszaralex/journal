import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../client";
import { authSessions } from "../schema";

export type SessionRow = {
  sessionToken: string;
  name: string | null;
  userAgent: string | null;
  createdAt: Date | null;
  expires: Date;
};

export function listSessionsForUser(userId: string): SessionRow[] {
  return db
    .select({
      sessionToken: authSessions.sessionToken,
      name: authSessions.name,
      userAgent: authSessions.userAgent,
      createdAt: authSessions.createdAt,
      expires: authSessions.expires,
    })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.userId, userId),
        gt(authSessions.expires, new Date()),
      ),
    )
    .orderBy(desc(authSessions.expires))
    .all();
}

export function renameSession(
  sessionToken: string,
  userId: string,
  name: string,
): boolean {
  const result = db
    .update(authSessions)
    .set({ name })
    .where(
      and(
        eq(authSessions.sessionToken, sessionToken),
        eq(authSessions.userId, userId),
      ),
    )
    .run();
  return result.changes > 0;
}

export function deleteSession(sessionToken: string, userId: string): boolean {
  const result = db
    .delete(authSessions)
    .where(
      and(
        eq(authSessions.sessionToken, sessionToken),
        eq(authSessions.userId, userId),
      ),
    )
    .run();
  return result.changes > 0;
}
