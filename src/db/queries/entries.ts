import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import {
  entries,
  entryVersions,
  entryVersionTags,
  tags,
} from "../schema";

export type EntryWithVersion = {
  id: string;
  created_at: number;
  deleted_at: number | null;
  current_version_id: string;
  version: {
    id: string;
    entry_id: string;
    version_number: number;
    entry_date: string;
    text: string;
    mood_score: number | null;
    energy_score: number | null;
    edited_at: number;
    tags: { id: string; name: string; display_name: string }[];
  };
};

export type CreateEntryInput = {
  entry_date: string;
  text?: string;
  mood_score?: number | null;
  energy_score?: number | null;
  tag_ids?: string[];
};

export type UpdateEntryInput = {
  entry_date?: string;
  text?: string;
  mood_score?: number | null;
  energy_score?: number | null;
  tag_ids?: string[];
};

export type ListEntriesFilters = {
  from_date?: string;
  to_date?: string;
  tag_ids?: string[];
  min_mood?: number;
  max_mood?: number;
  include_deleted?: boolean;
  page?: number;
  page_size?: number;
};

function getEntryTags(versionId: string) {
  return db
    .select({ id: tags.id, name: tags.name, display_name: tags.display_name })
    .from(entryVersionTags)
    .innerJoin(tags, eq(entryVersionTags.tag_id, tags.id))
    .where(eq(entryVersionTags.version_id, versionId))
    .all();
}

export function createEntry(input: CreateEntryInput): EntryWithVersion {
  const entryId = createId();
  const versionId = createId();
  const now = Date.now();

  db.transaction((tx) => {
    // Defer FK checks: entries ↔ entry_versions form a circular reference.
    // Both records are inserted in the same transaction, so all FKs are
    // satisfied at commit time.
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);

    tx.insert(entryVersions)
      .values({
        id: versionId,
        entry_id: entryId,
        version_number: 1,
        entry_date: input.entry_date,
        text: input.text ?? "",
        mood_score: input.mood_score ?? null,
        energy_score: input.energy_score ?? null,
        edited_at: now,
      })
      .run();

    tx.insert(entries)
      .values({
        id: entryId,
        created_at: now,
        current_version_id: versionId,
      })
      .run();

    if (input.tag_ids?.length) {
      tx.insert(entryVersionTags)
        .values(input.tag_ids.map((tag_id) => ({ version_id: versionId, tag_id })))
        .run();
    }
  });

  return getEntry(entryId)!;
}

export function updateEntry(
  id: string,
  input: UpdateEntryInput
): EntryWithVersion | null {
  const current = getEntry(id);
  if (!current) return null;

  const versionId = createId();
  const now = Date.now();
  const cv = current.version;

  db.transaction((tx) => {
    tx.insert(entryVersions)
      .values({
        id: versionId,
        entry_id: id,
        version_number: cv.version_number + 1,
        entry_date: input.entry_date ?? cv.entry_date,
        text: input.text ?? cv.text,
        mood_score: input.mood_score !== undefined ? input.mood_score : cv.mood_score,
        energy_score:
          input.energy_score !== undefined ? input.energy_score : cv.energy_score,
        edited_at: now,
      })
      .run();

    tx.update(entries)
      .set({ current_version_id: versionId })
      .where(eq(entries.id, id))
      .run();

    if (input.tag_ids !== undefined && input.tag_ids.length > 0) {
      tx.insert(entryVersionTags)
        .values(input.tag_ids.map((tag_id) => ({ version_id: versionId, tag_id })))
        .run();
    }
  });

  return getEntry(id);
}

export function getEntry(id: string): EntryWithVersion | null {
  const row = db
    .select({
      id: entries.id,
      created_at: entries.created_at,
      deleted_at: entries.deleted_at,
      current_version_id: entries.current_version_id,
      v_id: entryVersions.id,
      v_entry_id: entryVersions.entry_id,
      v_version_number: entryVersions.version_number,
      v_entry_date: entryVersions.entry_date,
      v_text: entryVersions.text,
      v_mood_score: entryVersions.mood_score,
      v_energy_score: entryVersions.energy_score,
      v_edited_at: entryVersions.edited_at,
    })
    .from(entries)
    .innerJoin(
      entryVersions,
      eq(entries.current_version_id, entryVersions.id)
    )
    .where(eq(entries.id, id))
    .get();

  if (!row) return null;

  return {
    id: row.id,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    current_version_id: row.current_version_id,
    version: {
      id: row.v_id,
      entry_id: row.v_entry_id,
      version_number: row.v_version_number,
      entry_date: row.v_entry_date,
      text: row.v_text,
      mood_score: row.v_mood_score,
      energy_score: row.v_energy_score,
      edited_at: row.v_edited_at,
      tags: getEntryTags(row.v_id),
    },
  };
}

export function listEntries(filters: ListEntriesFilters = {}) {
  const {
    from_date,
    to_date,
    tag_ids,
    min_mood,
    max_mood,
    include_deleted = false,
    page = 1,
    page_size = 20,
  } = filters;

  const conditions = [];

  if (!include_deleted) {
    conditions.push(isNull(entries.deleted_at));
  }
  if (from_date) {
    conditions.push(gte(entryVersions.entry_date, from_date));
  }
  if (to_date) {
    conditions.push(lte(entryVersions.entry_date, to_date));
  }
  if (min_mood !== undefined) {
    conditions.push(gte(entryVersions.mood_score, min_mood));
  }
  if (max_mood !== undefined) {
    conditions.push(lte(entryVersions.mood_score, max_mood));
  }

  let query = db
    .select({
      id: entries.id,
      created_at: entries.created_at,
      deleted_at: entries.deleted_at,
      current_version_id: entries.current_version_id,
      v_id: entryVersions.id,
      v_entry_id: entryVersions.entry_id,
      v_version_number: entryVersions.version_number,
      v_entry_date: entryVersions.entry_date,
      v_text: entryVersions.text,
      v_mood_score: entryVersions.mood_score,
      v_energy_score: entryVersions.energy_score,
      v_edited_at: entryVersions.edited_at,
    })
    .from(entries)
    .innerJoin(
      entryVersions,
      eq(entries.current_version_id, entryVersions.id)
    )
    .$dynamic();

  if (tag_ids?.length) {
    const versionIdsWithTags = db
      .select({ version_id: entryVersionTags.version_id })
      .from(entryVersionTags)
      .where(inArray(entryVersionTags.tag_id, tag_ids));
    conditions.push(inArray(entries.current_version_id, versionIdsWithTags));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = query
    .orderBy(desc(entryVersions.entry_date), desc(entries.created_at))
    .limit(page_size)
    .offset((page - 1) * page_size)
    .all();

  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    current_version_id: row.current_version_id,
    version: {
      id: row.v_id,
      entry_id: row.v_entry_id,
      version_number: row.v_version_number,
      entry_date: row.v_entry_date,
      text: row.v_text,
      mood_score: row.v_mood_score,
      energy_score: row.v_energy_score,
      edited_at: row.v_edited_at,
      tags: getEntryTags(row.v_id),
    },
  }));
}

export function softDeleteEntry(id: string): void {
  db.update(entries)
    .set({ deleted_at: Date.now() })
    .where(eq(entries.id, id))
    .run();
}

export function restoreEntry(id: string): void {
  db.update(entries)
    .set({ deleted_at: null })
    .where(eq(entries.id, id))
    .run();
}

export function searchEntries(query: string, limit = 20) {
  const rows = db
    .all(
      sql`
        SELECT
          e.id,
          e.created_at,
          e.deleted_at,
          e.current_version_id,
          ev.id          AS v_id,
          ev.entry_id    AS v_entry_id,
          ev.version_number AS v_version_number,
          ev.entry_date  AS v_entry_date,
          ev.text        AS v_text,
          ev.mood_score  AS v_mood_score,
          ev.energy_score AS v_energy_score,
          ev.edited_at   AS v_edited_at
        FROM entries_fts
        JOIN entry_fts_data fd ON fd.id = entries_fts.rowid
        JOIN entry_versions ev ON ev.id = fd.version_id
        JOIN entries e ON e.current_version_id = ev.id
        WHERE entries_fts MATCH ${query}
          AND e.deleted_at IS NULL
        ORDER BY entries_fts.rank
        LIMIT ${limit}
      `
    )
    .map((row) => row as Record<string, unknown>);

  return rows.map((row) => ({
    id: row.id as string,
    created_at: row.created_at as number,
    deleted_at: row.deleted_at as number | null,
    current_version_id: row.current_version_id as string,
    version: {
      id: row.v_id as string,
      entry_id: row.v_entry_id as string,
      version_number: row.v_version_number as number,
      entry_date: row.v_entry_date as string,
      text: row.v_text as string,
      mood_score: row.v_mood_score as number | null,
      energy_score: row.v_energy_score as number | null,
      edited_at: row.v_edited_at as number,
      tags: getEntryTags(row.v_id as string),
    },
  }));
}

export function getVersionHistory(entryId: string) {
  const rows = db
    .select()
    .from(entryVersions)
    .where(eq(entryVersions.entry_id, entryId))
    .orderBy(desc(entryVersions.version_number))
    .all();

  return rows.map((v) => ({
    ...v,
    tags: getEntryTags(v.id),
  }));
}

export function rollbackToVersion(
  entryId: string,
  versionNumber: number
): void {
  const version = db
    .select({ id: entryVersions.id })
    .from(entryVersions)
    .where(
      and(
        eq(entryVersions.entry_id, entryId),
        eq(entryVersions.version_number, versionNumber)
      )
    )
    .get();

  if (!version) throw new Error(`Version ${versionNumber} not found`);

  db.update(entries)
    .set({ current_version_id: version.id })
    .where(eq(entries.id, entryId))
    .run();
}

export type CalendarDot = { entry_date: string; mood_score: number | null };

export function getCalendarData(from: string, to: string): CalendarDot[] {
  return db
    .select({
      entry_date: entryVersions.entry_date,
      mood_score: entryVersions.mood_score,
    })
    .from(entries)
    .innerJoin(entryVersions, eq(entries.current_version_id, entryVersions.id))
    .where(
      and(
        isNull(entries.deleted_at),
        gte(entryVersions.entry_date, from),
        lte(entryVersions.entry_date, to)
      )
    )
    .all();
}
