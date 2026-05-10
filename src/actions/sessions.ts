"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logAudit } from "@/db/queries/audit";
import {
  deleteSession,
  listSessionsForUser,
  renameSession,
  type SessionRow,
} from "@/db/queries/sessions";

const tokenSchema = z.string().min(1);
const nameSchema = z.string().trim().min(1).max(60);

async function getCurrentSessionToken(): Promise<string | null> {
  const store = await cookies();
  return (
    store.get("authjs.session-token")?.value ??
    store.get("__Secure-authjs.session-token")?.value ??
    null
  );
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export type SessionListItem = SessionRow & { isCurrent: boolean };

export async function listSessionsAction(): Promise<SessionListItem[]> {
  const userId = await requireUserId();
  const current = await getCurrentSessionToken();
  return listSessionsForUser(userId).map((s) => ({
    ...s,
    isCurrent: s.sessionToken === current,
  }));
}

export async function renameSessionAction(token: string, name: string) {
  const userId = await requireUserId();
  const validToken = tokenSchema.parse(token);
  const validName = nameSchema.parse(name);
  const ok = renameSession(validToken, userId, validName);
  if (!ok) throw new Error("Session not found");
  logAudit("auth.session.rename", { user_id: userId });
  revalidatePath("/settings/sessions");
}

export async function deleteSessionAction(token: string) {
  const userId = await requireUserId();
  const validToken = tokenSchema.parse(token);
  const current = await getCurrentSessionToken();
  if (validToken === current) {
    throw new Error("Cannot revoke the current session");
  }
  const ok = deleteSession(validToken, userId);
  if (!ok) throw new Error("Session not found");
  logAudit("auth.session.revoke", { user_id: userId });
  revalidatePath("/settings/sessions");
}
