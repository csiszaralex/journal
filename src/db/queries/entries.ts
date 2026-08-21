import { createId } from '@paralleldrive/cuid2';
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../client';
import {
  emotions,
  entries,
  entryQaPairs,
  entryVersionEmotions,
  entryVersions,
  entryVersionTags,
  tags,
} from '../schema';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type QAPairInput = { position: number; question: string; answer: string };

export type TagSummary = { id: string; name: string; display_name: string; color: string };
export type EmotionSummary = {
  id: string;
  name: string;
  display_name: string;
  color: string;
  emoji: string | null;
};

export type EntryKind = 'daily' | 'summary';

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
    kind: EntryKind;
    period_start: string | null;
    edited_at: number;
    tags: TagSummary[];
    emotions: EmotionSummary[];
    qa_pairs: { position: number; question: string; answer: string }[];
  };
};

export type CreateEntryInput = {
  entry_date: string;
  text?: string;
  mood_score?: number | null;
  energy_score?: number | null;
  tag_ids?: string[];
  emotion_ids?: string[];
  client_id?: string;
  qa_pairs?: QAPairInput[];
  kind?: EntryKind;
  period_start?: string | null;
};

export type UpdateEntryInput = {
  entry_date?: string;
  text?: string;
  mood_score?: number | null;
  energy_score?: number | null;
  tag_ids?: string[];
  emotion_ids?: string[];
  qa_pairs?: QAPairInput[];
  kind?: EntryKind;
  period_start?: string | null;
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

function getEntryTags(versionId: string): TagSummary[] {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      display_name: tags.display_name,
      color: tags.color,
    })
    .from(entryVersionTags)
    .innerJoin(tags, eq(entryVersionTags.tag_id, tags.id))
    .where(eq(entryVersionTags.version_id, versionId))
    .all();
}

function getEntryEmotions(versionId: string): EmotionSummary[] {
  return db
    .select({
      id: emotions.id,
      name: emotions.name,
      display_name: emotions.display_name,
      color: emotions.color,
      emoji: emotions.emoji,
    })
    .from(entryVersionEmotions)
    .innerJoin(emotions, eq(entryVersionEmotions.emotion_id, emotions.id))
    .where(eq(entryVersionEmotions.version_id, versionId))
    .orderBy(entryVersionEmotions.position)
    .all();
}

export function getEntryQAPairs(
  versionId: string,
): Array<{ position: number; question: string; answer: string }> {
  return db
    .select({
      position: entryQaPairs.position,
      question: entryQaPairs.question,
      answer: entryQaPairs.answer,
    })
    .from(entryQaPairs)
    .where(eq(entryQaPairs.entry_version_id, versionId))
    .orderBy(entryQaPairs.position)
    .all();
}

export function insertEntryQAPairs(versionId: string, pairs: QAPairInput[], tx?: Tx): void {
  if (!pairs.length) return;
  const runner = tx ?? db;
  const now = Date.now();
  runner
    .insert(entryQaPairs)
    .values(
      pairs.map((p) => ({
        entry_version_id: versionId,
        position: p.position,
        question: p.question,
        answer: p.answer,
        created_at: now,
      })),
    )
    .run();
}

export function getEntryByDate(dateISO: string): EntryWithVersion | null {
  const row = db
    .select({ id: entries.id })
    .from(entries)
    .innerJoin(entryVersions, eq(entryVersions.id, entries.current_version_id))
    .where(
      and(
        isNull(entries.deleted_at),
        eq(entryVersions.entry_date, dateISO),
        eq(entryVersions.kind, 'daily'),
      ),
    )
    .get();
  return row ? getEntry(row.id) : null;
}

export class DuplicateDateError extends Error {
  constructor(
    public readonly entryId: string,
    public readonly entryDate: string,
  ) {
    super(`Active entry already exists for ${entryDate}`);
    this.name = 'DuplicateDateError';
  }
}

/**
 * A summary with no period_start is a black hole: excluded from the daily
 * metrics by its kind, and invisible to getSummaryRanges because that requires
 * a non-null period_start. The zod layer (refineEntryPeriod) blocks it over
 * HTTP; this is the query layer's half of the same invariant.
 */
export class MissingPeriodStartError extends Error {
  constructor(public readonly entryDate: string) {
    super(`Summary entry ending ${entryDate} has no period_start`);
    this.name = 'MissingPeriodStartError';
  }
}

export function createEntry(input: CreateEntryInput): EntryWithVersion {
  // Deduplicate: if a version with this client_id already exists, return it.
  if (input.client_id) {
    const existing = db
      .select({ entry_id: entryVersions.entry_id })
      .from(entryVersions)
      .where(eq(entryVersions.client_id, input.client_id))
      .get();
    if (existing) return getEntry(existing.entry_id)!;
  }

  // One active *daily* entry per day. Summaries are exempt: a recap ending on a
  // day that already has a daily entry is normal. Caller (sync route) must catch
  // and route to updateEntry.
  const kind: EntryKind = input.kind ?? 'daily';
  if (kind === 'daily') {
    const dupe = getEntryByDate(input.entry_date);
    if (dupe) throw new DuplicateDateError(dupe.id, input.entry_date);
  } else if (!input.period_start) {
    throw new MissingPeriodStartError(input.entry_date);
  }

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
        text: input.text ?? '',
        mood_score: input.mood_score ?? null,
        energy_score: input.energy_score ?? null,
        kind,
        period_start: kind === 'summary' ? (input.period_start ?? null) : null,
        edited_at: now,
        client_id: input.client_id ?? null,
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

    if (input.emotion_ids?.length) {
      tx.insert(entryVersionEmotions)
        .values(
          input.emotion_ids.map((emotion_id, index) => ({
            version_id: versionId,
            emotion_id,
            position: index,
          })),
        )
        .run();
    }

    insertEntryQAPairs(versionId, input.qa_pairs ?? [], tx);
  });

  return getEntry(entryId)!;
}

export function updateEntry(id: string, input: UpdateEntryInput): EntryWithVersion | null {
  const current = getEntry(id);
  if (!current) return null;

  const versionId = createId();
  const now = Date.now();
  const cv = current.version;

  // Both fields inherit from the current version when not supplied, mirroring
  // entry_date. Resolved up front so the invariant can be checked before writing.
  const nextKind: EntryKind = input.kind ?? cv.kind;
  const nextEntryDate = input.entry_date ?? cv.entry_date;
  const nextPeriodStart =
    nextKind === 'summary' ? (input.period_start ?? cv.period_start) : null;
  if (nextKind === 'summary' && !nextPeriodStart) {
    throw new MissingPeriodStartError(nextEntryDate);
  }

  db.transaction((tx) => {
    tx.insert(entryVersions)
      .values({
        id: versionId,
        entry_id: id,
        version_number: cv.version_number + 1,
        entry_date: nextEntryDate,
        text: input.text ?? cv.text,
        mood_score: input.mood_score !== undefined ? input.mood_score : cv.mood_score,
        energy_score: input.energy_score !== undefined ? input.energy_score : cv.energy_score,
        kind: nextKind,
        period_start: nextPeriodStart,
        edited_at: now,
      })
      .run();

    tx.update(entries).set({ current_version_id: versionId }).where(eq(entries.id, id)).run();

    if (input.tag_ids?.length) {
      tx.insert(entryVersionTags)
        .values(input.tag_ids.map((tag_id) => ({ version_id: versionId, tag_id })))
        .run();
    }

    if (input.emotion_ids?.length) {
      tx.insert(entryVersionEmotions)
        .values(
          input.emotion_ids.map((emotion_id, index) => ({
            version_id: versionId,
            emotion_id,
            position: index,
          })),
        )
        .run();
    }

    insertEntryQAPairs(versionId, input.qa_pairs ?? [], tx);
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
      v_kind: entryVersions.kind,
      v_period_start: entryVersions.period_start,
      v_edited_at: entryVersions.edited_at,
    })
    .from(entries)
    .innerJoin(entryVersions, eq(entries.current_version_id, entryVersions.id))
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
      kind: row.v_kind as EntryKind,
      period_start: row.v_period_start,
      edited_at: row.v_edited_at,
      tags: getEntryTags(row.v_id),
      emotions: getEntryEmotions(row.v_id),
      qa_pairs: getEntryQAPairs(row.v_id),
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
      v_kind: entryVersions.kind,
      v_period_start: entryVersions.period_start,
      v_edited_at: entryVersions.edited_at,
    })
    .from(entries)
    .innerJoin(entryVersions, eq(entries.current_version_id, entryVersions.id))
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
      kind: row.v_kind as EntryKind,
      period_start: row.v_period_start,
      edited_at: row.v_edited_at,
      tags: getEntryTags(row.v_id),
      emotions: getEntryEmotions(row.v_id),
      qa_pairs: getEntryQAPairs(row.v_id),
    },
  }));
}

export function softDeleteEntry(id: string): void {
  db.update(entries).set({ deleted_at: Date.now() }).where(eq(entries.id, id)).run();
}

export function searchEntries(query: string, limit = 20) {
  const searchRowSchema = z.object({
    id: z.string(),
    created_at: z.number(),
    deleted_at: z.number().nullable(),
    current_version_id: z.string(),
    v_id: z.string(),
    v_entry_id: z.string(),
    v_version_number: z.number(),
    v_entry_date: z.string(),
    v_text: z.string(),
    v_mood_score: z.number().nullable(),
    v_energy_score: z.number().nullable(),
    v_kind: z.string(),
    v_period_start: z.string().nullable(),
    v_edited_at: z.number(),
  });

  const rawRows = db.all(
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
          ev.kind          AS v_kind,
          ev.period_start  AS v_period_start,
          ev.edited_at   AS v_edited_at
        FROM entries_fts
        JOIN entry_fts_data fd ON fd.id = entries_fts.rowid
        JOIN entry_versions ev ON ev.id = fd.version_id
        JOIN entries e ON e.current_version_id = ev.id
        WHERE entries_fts MATCH ${query}
          AND e.deleted_at IS NULL
        ORDER BY entries_fts.rank
        LIMIT ${limit}
      `,
  );

  const rows = z.array(searchRowSchema).parse(rawRows);

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
      kind: row.v_kind as EntryKind,
      period_start: row.v_period_start,
      edited_at: row.v_edited_at,
      tags: getEntryTags(row.v_id),
      emotions: getEntryEmotions(row.v_id),
      qa_pairs: getEntryQAPairs(row.v_id),
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
    emotions: getEntryEmotions(v.id),
    qa_pairs: getEntryQAPairs(v.id),
  }));
}

export function rollbackToVersion(entryId: string, versionNumber: number): void {
  const version = db
    .select({ id: entryVersions.id })
    .from(entryVersions)
    .where(
      and(eq(entryVersions.entry_id, entryId), eq(entryVersions.version_number, versionNumber)),
    )
    .get();

  if (!version) throw new Error(`Version ${versionNumber} not found`);

  db.update(entries).set({ current_version_id: version.id }).where(eq(entries.id, entryId)).run();
}

export type DailyStat = {
  entry_date: string;
  avg_mood: number | null;
  avg_energy: number | null;
  entry_count: number;
};

export function getDailyStats(from: string, to: string): DailyStat[] {
  const dailyStatSchema = z.object({
    entry_date: z.string(),
    avg_mood: z.number().nullable(),
    avg_energy: z.number().nullable(),
    entry_count: z.number(),
  });

  const rawRows = db.all(
    sql`
        SELECT
          ev.entry_date,
          AVG(ev.mood_score)    AS avg_mood,
          AVG(ev.energy_score)  AS avg_energy,
          COUNT(*)              AS entry_count
        FROM entries e
        INNER JOIN entry_versions ev ON e.current_version_id = ev.id
        WHERE e.deleted_at IS NULL
          AND ev.entry_date >= ${from}
          AND ev.entry_date <= ${to}
          AND ev.kind = 'daily'
        GROUP BY ev.entry_date
        ORDER BY ev.entry_date ASC
      `,
  );

  const rows = z.array(dailyStatSchema).parse(rawRows);

  return rows.map((r) => ({
    entry_date: r.entry_date,
    avg_mood: r.avg_mood !== null ? Math.round(r.avg_mood * 10) / 10 : null,
    avg_energy: r.avg_energy !== null ? Math.round(r.avg_energy * 10) / 10 : null,
    entry_count: r.entry_count,
  }));
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCurrentStreak(): number {
  return getStreakInfo().streak;
}

export type StreakInfo = { streak: number; wroteToday: boolean };

export function getStreakInfo(): StreakInfo {
  const todayForQuery = localDateStr(new Date());

  const dateRowSchema = z.object({ entry_date: z.string() });
  const rawRows = db.all(
    sql`
        SELECT DISTINCT ev.entry_date
        FROM entries e
        INNER JOIN entry_versions ev ON e.current_version_id = ev.id
        WHERE e.deleted_at IS NULL
          AND ev.entry_date <= ${todayForQuery}
          AND ev.kind = 'daily'
        ORDER BY ev.entry_date DESC
      `,
  );

  const rows = z
    .array(dateRowSchema)
    .parse(rawRows)
    .map((r) => r.entry_date);

  if (rows.length === 0) return { streak: 0, wroteToday: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);

  const wroteToday = rows[0] === todayStr;

  // Count consecutive days starting from today (if wrote) or yesterday (grace period)
  const cursor = new Date(today);
  if (!wroteToday) {
    cursor.setDate(cursor.getDate() - 1);
    if (rows[0] !== localDateStr(cursor)) return { streak: 0, wroteToday: false };
  }

  let streak = 0;
  for (const date of rows) {
    if (date === localDateStr(cursor)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak, wroteToday };
}

export type GapInfo = { lastDailyDate: string | null; gapDays: number };

/**
 * Days elapsed since the most recent daily entry (0 if the user wrote today).
 * Summaries are ignored: writing one must not make the gap look closed.
 */
export function getGapInfo(): GapInfo {
  const todayStr = localDateStr(new Date());
  const rowSchema = z.object({ last_date: z.string().nullable() });
  const rawRow = db.get(
    sql`
        SELECT MAX(ev.entry_date) AS last_date
        FROM entries e
        INNER JOIN entry_versions ev ON e.current_version_id = ev.id
        WHERE e.deleted_at IS NULL
          AND ev.kind = 'daily'
          AND ev.entry_date <= ${todayStr}
      `,
  );
  const row = rowSchema.optional().parse(rawRow ?? undefined);
  const lastDailyDate = row?.last_date ?? null;
  if (!lastDailyDate) return { lastDailyDate: null, gapDays: 0 };

  const last = new Date(lastDailyDate + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const gapDays = Math.round((today.getTime() - last.getTime()) / 86400000);
  return { lastDailyDate, gapDays };
}

export function getLongestStreak(): number {
  const dateRowSchema = z.object({ entry_date: z.string() });
  const rawRows = db.all(
    sql`
        SELECT DISTINCT ev.entry_date
        FROM entries e
        INNER JOIN entry_versions ev ON e.current_version_id = ev.id
        WHERE e.deleted_at IS NULL
          AND ev.kind = 'daily'
        ORDER BY ev.entry_date ASC
      `,
  );

  const rows = z
    .array(dateRowSchema)
    .parse(rawRows)
    .map((r) => r.entry_date);

  if (rows.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1] + 'T00:00:00');
    const curr = new Date(rows[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

export type OverallStats = {
  total_entries: number;
  avg_mood_30d: number | null;
  avg_energy_30d: number | null;
  streak: number;
  longest_streak: number;
};

export function getOverallStats(): OverallStats {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const from30 = thirtyDaysAgo.toISOString().slice(0, 10);

  const totalSchema = z.object({ cnt: z.number() });
  const totalsRaw = db.get(
    sql`
        SELECT COUNT(*) AS cnt
        FROM entries e
        INNER JOIN entry_versions ev ON e.current_version_id = ev.id
        WHERE e.deleted_at IS NULL AND ev.kind = 'daily'
      `,
  );
  const totals = totalSchema.optional().parse(totalsRaw ?? undefined);

  const avgsSchema = z.object({
    avg_mood: z.number().nullable(),
    avg_energy: z.number().nullable(),
  });
  const avgsRaw = db.get(
    sql`
        SELECT
          AVG(ev.mood_score)   AS avg_mood,
          AVG(ev.energy_score) AS avg_energy
        FROM entries e
        INNER JOIN entry_versions ev ON e.current_version_id = ev.id
        WHERE e.deleted_at IS NULL AND ev.entry_date >= ${from30} AND ev.kind = 'daily'
      `,
  );
  const avgs = avgsSchema.optional().parse(avgsRaw ?? undefined);

  return {
    total_entries: totals?.cnt ?? 0,
    avg_mood_30d:
      avgs?.avg_mood !== null && avgs?.avg_mood !== undefined
        ? Math.round(avgs.avg_mood * 10) / 10
        : null,
    avg_energy_30d:
      avgs?.avg_energy !== null && avgs?.avg_energy !== undefined
        ? Math.round(avgs.avg_energy * 10) / 10
        : null,
    streak: getCurrentStreak(),
    longest_streak: getLongestStreak(),
  };
}

export function getFirstEntryDate(): string | null {
  const firstDateSchema = z.object({ first_date: z.string().nullable() });
  const rawRow = db.get(
    sql`
        SELECT MIN(ev.entry_date) AS first_date
        FROM entries e
        INNER JOIN entry_versions ev ON e.current_version_id = ev.id
        WHERE e.deleted_at IS NULL AND ev.kind = 'daily'
      `,
  );
  const row = firstDateSchema.optional().parse(rawRow ?? undefined);
  return row?.first_date ?? null;
}

export type CalendarDot = {
  entry_date: string;
  mood_score: number | null;
  emojis: string[];
  emotionColors: string[];
};

export function getCalendarData(from: string, to: string): CalendarDot[] {
  const moodRows = db
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
        lte(entryVersions.entry_date, to),
        eq(entryVersions.kind, 'daily'),
      ),
    )
    .all();

  const emojiRows = db
    .select({
      entry_date: entryVersions.entry_date,
      emoji: emotions.emoji,
    })
    .from(entries)
    .innerJoin(entryVersions, eq(entries.current_version_id, entryVersions.id))
    .innerJoin(entryVersionEmotions, eq(entryVersionEmotions.version_id, entryVersions.id))
    .innerJoin(emotions, eq(emotions.id, entryVersionEmotions.emotion_id))
    .where(
      and(
        isNull(entries.deleted_at),
        gte(entryVersions.entry_date, from),
        lte(entryVersions.entry_date, to),
        eq(entryVersions.kind, 'daily'),
        isNotNull(emotions.emoji),
        ne(emotions.emoji, ''),
      ),
    )
    .orderBy(entryVersions.entry_date, entryVersionEmotions.position)
    .all();

  const colorRows = db
    .select({
      entry_date: entryVersions.entry_date,
      color: emotions.color,
    })
    .from(entries)
    .innerJoin(entryVersions, eq(entries.current_version_id, entryVersions.id))
    .innerJoin(entryVersionEmotions, eq(entryVersionEmotions.version_id, entryVersions.id))
    .innerJoin(emotions, eq(emotions.id, entryVersionEmotions.emotion_id))
    .where(
      and(
        isNull(entries.deleted_at),
        gte(entryVersions.entry_date, from),
        lte(entryVersions.entry_date, to),
        eq(entryVersions.kind, 'daily'),
        isNotNull(emotions.color),
        ne(emotions.color, ''),
      ),
    )
    .orderBy(entryVersions.entry_date, entryVersionEmotions.position)
    .all();

  const emojisByDate = new Map<string, string[]>();
  for (const row of emojiRows) {
    if (!row.emoji || emojisByDate.has(row.entry_date)) continue;
    emojisByDate.set(row.entry_date, [row.emoji]);
  }

  const colorsByDate = new Map<string, string[]>();
  for (const row of colorRows) {
    const existing = colorsByDate.get(row.entry_date) ?? [];
    if (existing.length < 3) {
      existing.push(row.color);
      colorsByDate.set(row.entry_date, existing);
    }
  }

  return moodRows.map((r) => ({
    entry_date: r.entry_date,
    mood_score: r.mood_score,
    emojis: emojisByDate.get(r.entry_date) ?? [],
    emotionColors: colorsByDate.get(r.entry_date) ?? [],
  }));
}

/**
 * Distinct dates (yyyy-MM-dd) that have a non-deleted entry within [from, to].
 * Lighter than getCalendarData — used to mark "filled" days in the form's date picker.
 */
export function getEntryDates(from: string, to: string): string[] {
  const rows = db
    .selectDistinct({ entry_date: entryVersions.entry_date })
    .from(entries)
    .innerJoin(entryVersions, eq(entries.current_version_id, entryVersions.id))
    .where(
      and(
        isNull(entries.deleted_at),
        gte(entryVersions.entry_date, from),
        lte(entryVersions.entry_date, to),
        eq(entryVersions.kind, 'daily'),
      ),
    )
    .all();
  return rows.map((r) => r.entry_date);
}

export function getTodayEntryId(todayISO: string): string | null {
  return getEntryByDate(todayISO)?.id ?? null;
}

export type SummaryRange = { id: string; period_start: string; entry_date: string };

/**
 * Every summary overlapping [from, to] — a summary starting before the window
 * (or ending after it) still counts, so a calendar band spanning a month
 * boundary renders correctly.
 */
export function getSummaryRanges(from: string, to: string): SummaryRange[] {
  const rows = db
    .select({
      id: entries.id,
      period_start: entryVersions.period_start,
      entry_date: entryVersions.entry_date,
    })
    .from(entries)
    .innerJoin(entryVersions, eq(entries.current_version_id, entryVersions.id))
    .where(
      and(
        isNull(entries.deleted_at),
        eq(entryVersions.kind, 'summary'),
        isNotNull(entryVersions.period_start),
        lte(entryVersions.period_start, to),
        gte(entryVersions.entry_date, from),
      ),
    )
    .all();

  return rows
    .filter((r): r is SummaryRange => r.period_start !== null)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

