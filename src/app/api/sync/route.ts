export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createEntry, updateEntry, softDeleteEntry } from "@/db/queries/entries";
import { logAudit } from "@/db/queries/audit";
import { entryInputSchema } from "@/lib/validation";
import { resolveTagIds } from "@/lib/entry-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const qaPairsSchema = z
  .array(
    z.object({
      position: z.number().int().min(0).max(20),
      question: z.string().min(1).max(500),
      answer: z.string().min(1).max(2000),
    }),
  )
  .max(10)
  .optional();

const syncRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createEntry"),
    payload: entryInputSchema.extend({ qa_pairs: qaPairsSchema }),
    clientId: z.string().optional(),
  }),
  z.object({
    action: z.literal("updateEntry"),
    payload: entryInputSchema.extend({
      entry_id: z.string(),
      qa_pairs: qaPairsSchema,
    }),
    clientId: z.string().optional(),
  }),
  z.object({
    action: z.literal("softDeleteEntry"),
    payload: z.object({ entry_id: z.string() }),
    clientId: z.string().optional(),
  }),
]);

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
      const { text, mood_score, energy_score, entry_date, tags, qa_pairs } = payload;
      const created = createEntry({
        entry_date,
        text,
        mood_score,
        energy_score,
        tag_ids: resolveTagIds(tags),
        client_id: clientId,
        qa_pairs,
      });
      logAudit("entry.create", { entry_id: created.id, entry_date, via: "sync" });
      revalidatePath("/");
      return NextResponse.json({ ok: true, id: created.id });
    }

    if (action === "updateEntry") {
      const { entry_id, text, mood_score, energy_score, entry_date, tags, qa_pairs } = payload;
      const updated = updateEntry(entry_id, {
        entry_date,
        text,
        mood_score,
        energy_score,
        tag_ids: resolveTagIds(tags),
        qa_pairs,
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
