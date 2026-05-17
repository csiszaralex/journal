"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { logAudit } from "@/db/queries/audit";
import { deleteSession, renameSession } from "@/db/queries/sessions";

async function getCurrentSessionToken(): Promise<string | null> {
  const store = await cookies();
  return (
    store.get("authjs.session-token")?.value ??
    store.get("__Secure-authjs.session-token")?.value ??
    null
  );
}

export const renameSessionAction = authActionClient
  .inputSchema(
    z.object({
      token: z.string().min(1),
      name: z.string().trim().min(1).max(60),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const ok = renameSession(parsedInput.token, ctx.userId, parsedInput.name);
    if (!ok) throw new Error("Session not found");
    logAudit("auth.session.rename", { user_id: ctx.userId });
    revalidatePath("/settings/sessions");
  });

export const deleteSessionAction = authActionClient
  .inputSchema(z.object({ token: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const current = await getCurrentSessionToken();
    if (parsedInput.token === current) {
      throw new Error("Cannot revoke the current session");
    }
    const ok = deleteSession(parsedInput.token, ctx.userId);
    if (!ok) throw new Error("Session not found");
    logAudit("auth.session.revoke", { user_id: ctx.userId });
    revalidatePath("/settings/sessions");
  });
