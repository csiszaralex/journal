export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createEntry, updateEntry, softDeleteEntry } from "@/db/queries/entries";
import { getOrCreateTag } from "@/db/queries/tags";
import { logAudit } from "@/db/queries/audit";
import { entryInputSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const syncRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createEntry"),
    payload: entryInputSchema,
    clientId: z.string().optional(),
  }),
  z.object({
    action: z.literal("updateEntry"),
    payload: entryInputSchema.extend({ entry_id: z.string() }),
    clientId: z.string().optional(),
  }),
  z.object({
    action: z.literal("softDeleteEntry"),
    payload: z.object({ entry_id: z.string() }),
    clientId: z.string().optional(),
  }),
]);

function resolveTagIds(tagsJson: string): string[] {
  try {
    const names: string[] = JSON.parse(tagsJson || "[]");
    return names.map((n) => getOrCreateTag(n).id);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Validation failures must NOT be retried by the client
    return NextResponse.json(
      { ok: false, error: parsed.error.message, noRetry: true },
      { status: 422 }
    );
  }

  const { action, payload, clientId } = parsed.data;

  try {
    if (action === "createEntry") {
      const { text, mood_score, energy_score, entry_date, tags } = payload;
      const created = createEntry({
        entry_date,
        text,
        mood_score,
        energy_score,
        tag_ids: resolveTagIds(tags),
        client_id: clientId,
      });
      logAudit("entry.create", { entry_id: created.id, entry_date, via: "sync" });
      revalidatePath("/");
      return NextResponse.json({ ok: true, id: created.id });
    }

    if (action === "updateEntry") {
      const { entry_id, text, mood_score, energy_score, entry_date, tags } = payload;
      const updated = updateEntry(entry_id, {
        entry_date,
        text,
        mood_score,
        energy_score,
        tag_ids: resolveTagIds(tags),
      });
      if (!updated) {
        return NextResponse.json({ ok: false, error: "Entry not found", noRetry: true }, { status: 404 });
      }
      logAudit("entry.update", { entry_id, version: updated.version.version_number, via: "sync" });
      revalidatePath("/");
      revalidatePath(`/entry/${entry_id}`);
      return NextResponse.json({ ok: true, id: entry_id });
    }

    if (action === "softDeleteEntry") {
      const { entry_id } = payload;
      softDeleteEntry(entry_id);
      logAudit("entry.delete", { entry_id, via: "sync" });
      revalidatePath("/");
      return NextResponse.json({ ok: true, id: entry_id });
    }
  } catch (err) {
    console.error("[sync]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
