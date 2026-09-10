export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createEntry, updateEntry, softDeleteEntry, DuplicateDateError } from "@/db/queries/entries";
import { logAudit } from "@/db/queries/audit";
import { makeEntryInputObjectSchema, refineEntryPeriod } from "@/lib/validation";
import { getDict } from "@/i18n/request";
import type { Dictionary } from "@/i18n/dictionary";
import { resolveEmotionIds, resolveTagIds } from "@/lib/entry-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dismissNotificationsForDate } from "@/lib/push";

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

// Built per request rather than once at import: the payload schema carries the
// messages the entry form shows, and which language those are in is decided per
// request. See the note at the top of `@/lib/validation`.
function makeSyncRequestSchema(d: Dictionary) {
  const entryPayload = makeEntryInputObjectSchema(d);
  const withPeriodRule = refineEntryPeriod(d);
  return z.discriminatedUnion("action", [
    z.object({
      action: z.literal("createEntry"),
      payload: entryPayload.extend({ qa_pairs: qaPairsSchema }).superRefine(withPeriodRule),
      clientId: z.string().optional(),
    }),
    z.object({
      action: z.literal("updateEntry"),
      payload: entryPayload
        .extend({ entry_id: z.string(), qa_pairs: qaPairsSchema })
        .superRefine(withPeriodRule),
      clientId: z.string().optional(),
    }),
    z.object({
      action: z.literal("softDeleteEntry"),
      payload: z.object({ entry_id: z.string() }),
      clientId: z.string().optional(),
    }),
  ]);
}

export async function POST(req: NextRequest) {
  const d = await getDict();
  const session = await auth();
  if (!session)
    return NextResponse.json({ ok: false, error: d.errors.api.unauthorized }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: d.errors.api.invalidJson }, { status: 400 });
  }

  const parsed = makeSyncRequestSchema(d).safeParse(body);
  if (!parsed.success) {
    // Validation failures must NOT be retried by the client.
    //
    // The first issue's message, not `error.message`: that one is the raw JSON
    // dump of every issue, and the entry form puts whatever arrives here
    // straight in front of the user. The fallback covers a failure that
    // somehow carried no issue at all.
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? d.errors.validation.invalidInput,
        noRetry: true,
      },
      { status: 422 }
    );
  }

  const { action, payload, clientId } = parsed.data;

  try {
    if (action === "createEntry") {
      const { text, mood_score, energy_score, entry_date, tags, emotions, qa_pairs, kind, period_start } =
        payload;
      const tag_ids = resolveTagIds(tags);
      const emotion_ids = resolveEmotionIds(emotions);
      try {
        const created = createEntry({
          entry_date,
          text,
          mood_score,
          energy_score,
          tag_ids,
          emotion_ids,
          client_id: clientId,
          qa_pairs,
          kind,
          period_start,
        });
        logAudit("entry.create", { entry_id: created.id, entry_date, via: "sync" });
        revalidatePath("/");
        // Only a daily entry means "written for this day" — a summary ending
        // today must not dismiss today's reminder. The saved kind is authoritative:
        // an omitted `kind` defaults to daily on create and inherits on update.
        if (created.version.kind === "daily") {
          dismissNotificationsForDate(entry_date).catch(() => {});
        }
        return NextResponse.json({ ok: true, id: created.id });
      } catch (err) {
        if (!(err instanceof DuplicateDateError)) throw err;
        // Concurrent tab or stale client tried to create a second entry for this date.
        // Convert to an update of the existing one.
        const updated = updateEntry(err.entryId, {
          entry_date,
          text,
          mood_score,
          energy_score,
          tag_ids,
          emotion_ids,
          qa_pairs,
          kind,
          period_start,
        });
        if (!updated) {
          return NextResponse.json({ ok: false, error: d.errors.api.entryNotFound, noRetry: true }, { status: 404 });
        }
        logAudit("entry.update", { entry_id: err.entryId, version: updated.version.version_number, via: "sync", from: "createEntry" });
        revalidatePath("/");
        revalidatePath(`/entry/${err.entryId}`);
        if (updated.version.kind === "daily") {
          dismissNotificationsForDate(entry_date).catch(() => {});
        }
        return NextResponse.json({ ok: true, id: err.entryId });
      }
    }

    if (action === "updateEntry") {
      const { entry_id, text, mood_score, energy_score, entry_date, tags, emotions, qa_pairs, kind, period_start } =
        payload;
      let updated: ReturnType<typeof updateEntry>;
      try {
        updated = updateEntry(entry_id, {
          entry_date,
          text,
          mood_score,
          energy_score,
          tag_ids: resolveTagIds(tags),
          emotion_ids: resolveEmotionIds(emotions),
          qa_pairs,
          kind,
          period_start,
        });
      } catch (err) {
        if (!(err instanceof DuplicateDateError)) throw err;
        // Turning a summary into a daily entry on a date that already has one.
        // Unlike the createEntry path there is nothing to recover to — merging two
        // distinct entries is not this route's call — so report it and don't retry.
        return NextResponse.json(
          { ok: false, error: d.errors.api.duplicateEntryDate, noRetry: true },
          { status: 409 },
        );
      }
      if (!updated) {
        return NextResponse.json({ ok: false, error: d.errors.api.entryNotFound, noRetry: true }, { status: 404 });
      }
      logAudit("entry.update", { entry_id, version: updated.version.version_number, via: "sync" });
      revalidatePath("/");
      revalidatePath(`/entry/${entry_id}`);
      if (updated.version.kind === "daily") {
        dismissNotificationsForDate(entry_date).catch(() => {});
      }
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
    return NextResponse.json({ ok: false, error: d.errors.api.internalError }, { status: 500 });
  }

  return NextResponse.json({ ok: false, error: d.errors.api.unknownAction }, { status: 400 });
}
