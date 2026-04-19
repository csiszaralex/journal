import { asc, desc, eq } from "drizzle-orm";
import { db } from "../client";
import {
  entries,
  entryVersions,
  entryVersionTags,
  tags,
  pushSubscriptions,
  auditLog,
} from "../schema";

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
          .select({ id: tags.id, name: tags.name, display_name: tags.display_name })
          .from(entryVersionTags)
          .innerJoin(tags, eq(entryVersionTags.tag_id, tags.id))
          .where(eq(entryVersionTags.version_id, v.id))
          .all();
        return { ...v, tags: vTags };
      }),
    };
  });
}

export function getAllTagsForExport() {
  return db
    .select()
    .from(tags)
    .orderBy(desc(tags.usage_count))
    .all();
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
