import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import {
  appSettings,
  emotions,
  entries,
  entryTemplates,
  entryVersions,
  entryVersionEmotions,
  entryVersionTags,
  intentions,
  intentionCategoryColors,
  tags,
  pushSubscriptions,
  auditLog,
  userProfileQa,
} from "../schema";
import { listEmotionsByUsage } from "./emotions";
import { getEntryQAPairs } from "./entries";
import { listTagsByUsage } from "./tags";

export function getAllEntriesForExport() {
  const allEntries = db
    .select({
      id: entries.id,
      created_at: entries.created_at,
      deleted_at: entries.deleted_at,
      current_version_id: entries.current_version_id,
    })
    .from(entries)
    .orderBy(asc(entries.created_at))
    .all();

  return allEntries.map((entry) => {
    const versions = db
      .select()
      .from(entryVersions)
      .where(eq(entryVersions.entry_id, entry.id))
      .orderBy(asc(entryVersions.version_number))
      .all();

    return {
      ...entry,
      versions: versions.map((v) => {
        const vTags = db
          .select({
            id: tags.id,
            name: tags.name,
            display_name: tags.display_name,
            color: tags.color,
          })
          .from(entryVersionTags)
          .innerJoin(tags, eq(entryVersionTags.tag_id, tags.id))
          .where(eq(entryVersionTags.version_id, v.id))
          .all();
        const vEmotions = db
          .select({
            id: emotions.id,
            name: emotions.name,
            display_name: emotions.display_name,
            color: emotions.color,
          })
          .from(entryVersionEmotions)
          .innerJoin(emotions, eq(entryVersionEmotions.emotion_id, emotions.id))
          .where(eq(entryVersionEmotions.version_id, v.id))
          .all();
        // The answers the user wrote to the AI's questions are their words as
        // much as the entry text, and they are versioned alongside it.
        return { ...v, tags: vTags, emotions: vEmotions, qa_pairs: getEntryQAPairs(v.id) };
      }),
    };
  });
}

// Both return the full row shape plus a live-computed `usage_count` (there is
// no stored counter), ordered by usage desc, then name asc.
export function getAllTagsForExport() {
  return listTagsByUsage();
}

export function getAllEmotionsForExport() {
  return listEmotionsByUsage();
}

export function getPushSubscriptionsForExport() {
  return db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      device_label: pushSubscriptions.device_label,
      user_agent: pushSubscriptions.user_agent,
      timezone: pushSubscriptions.timezone,
      notify_hour: pushSubscriptions.notify_hour,
      notify_minute: pushSubscriptions.notify_minute,
      enabled: pushSubscriptions.enabled,
      created_at: pushSubscriptions.created_at,
      last_seen_at: pushSubscriptions.last_seen_at,
    })
    .from(pushSubscriptions)
    .all();
}

export function getAuditLogForExport() {
  return db
    .select()
    .from(auditLog)
    .orderBy(asc(auditLog.created_at))
    .all();
}

export function getTemplatesForExport() {
  return db
    .select()
    .from(entryTemplates)
    .orderBy(asc(entryTemplates.created_at))
    .all();
}

/** Including soft-deleted ones: a backup keeps what the app is only hiding. */
export function getIntentionsForExport() {
  return db
    .select()
    .from(intentions)
    .orderBy(asc(intentions.created_at))
    .all();
}

export function getIntentionCategoryColorsForExport() {
  return db
    .select()
    .from(intentionCategoryColors)
    .orderBy(asc(intentionCategoryColors.name))
    .all();
}

export function getProfileQaForExport() {
  return db
    .select()
    .from(userProfileQa)
    .orderBy(asc(userProfileQa.position))
    .all();
}

/**
 * The whole key/value table, dumped as-is — it holds the AI history size, the
 * summary gap threshold, the registration toggle and the profile bio. Exported
 * verbatim rather than as named fields so a key added later is in the backup
 * without anyone having to remember to add it here.
 */
export function getSettingsForExport() {
  return db.select().from(appSettings).orderBy(asc(appSettings.key)).all();
}
