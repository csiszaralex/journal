"use server";

import {
  getAllEmotionsForExport,
  getAllEntriesForExport,
  getAllTagsForExport,
  getAuditLogForExport,
  getIntentionCategoryColorsForExport,
  getIntentionsForExport,
  getProfileQaForExport,
  getPushSubscriptionsForExport,
  getSettingsForExport,
  getTemplatesForExport,
} from "@/db/queries/export";
import { logAudit } from "@/db/queries/audit";
import { buildMarkdownExport } from "@/lib/export-markdown";
import { authActionClient } from "@/lib/safe-action";

// 2 added the entries' Q&A pairs plus templates, intentions (with their category
// colours), the profile Q&A and the settings table — everything the app stores
// that the user wrote, rather than only the parts that existed when v1 shipped.
//
// Still out, on purpose: the push subscriptions' p256dh/auth keys (device
// secrets, unusable from a file), the Auth.js user/session/passkey tables
// (credentials do not belong in a downloadable dump, and a passkey cannot be
// restored from one), and notifications_sent (send bookkeeping, worthless here).
const SCHEMA_VERSION = 2;

export const exportJsonAction = authActionClient.action(async () => {
  const data = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    entries: getAllEntriesForExport(),
    tags: getAllTagsForExport(),
    emotions: getAllEmotionsForExport(),
    templates: getTemplatesForExport(),
    intentions: getIntentionsForExport(),
    intention_category_colors: getIntentionCategoryColorsForExport(),
    profile_qa: getProfileQaForExport(),
    settings: getSettingsForExport(),
    push_subscriptions: getPushSubscriptionsForExport(),
    audit_log: getAuditLogForExport(),
  };

  logAudit("export.json", { entry_count: data.entries.length });

  return JSON.stringify(data, null, 2);
});

export const exportMarkdownAction = authActionClient.action(async () => {
  const { markdown, entryCount } = buildMarkdownExport(getAllEntriesForExport());

  logAudit("export.markdown", { entry_count: entryCount });

  return markdown;
});
