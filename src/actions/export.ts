"use server";

import {
  getAllEmotionsForExport,
  getAllEntriesForExport,
  getAllTagsForExport,
  getPushSubscriptionsForExport,
  getAuditLogForExport,
} from "@/db/queries/export";
import { logAudit } from "@/db/queries/audit";
import { authActionClient } from "@/lib/safe-action";

const SCHEMA_VERSION = 1;

export const exportJsonAction = authActionClient.action(async () => {
  const data = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    entries: getAllEntriesForExport(),
    tags: getAllTagsForExport(),
    emotions: getAllEmotionsForExport(),
    push_subscriptions: getPushSubscriptionsForExport(),
    audit_log: getAuditLogForExport(),
  };

  logAudit("export.json", { entry_count: data.entries.length });

  return JSON.stringify(data, null, 2);
});

export const exportMarkdownAction = authActionClient.action(async () => {
  const entries = getAllEntriesForExport();

  const sorted = entries
    .filter((e) => e.deleted_at == null)
    .map((e) => {
      const current = e.versions.find((v) => v.id === e.current_version_id)!;
      return { entry: e, current };
    })
    .sort((a, b) =>
      a.current.entry_date < b.current.entry_date ? -1 : 1
    );

  const parts = sorted.map(({ entry, current }) => {
    const tagNames = current.tags.map((t) => t.display_name);
    const emotionNames = current.emotions.map((e) => e.display_name);
    const frontmatter = [
      "---",
      `date: ${current.entry_date}`,
      current.mood_score != null ? `mood: ${current.mood_score}` : null,
      current.energy_score != null ? `energy: ${current.energy_score}` : null,
      tagNames.length > 0 ? `tags: [${tagNames.map((t) => `"${t}"`).join(", ")}]` : null,
      emotionNames.length > 0
        ? `emotions: [${emotionNames.map((e) => `"${e}"`).join(", ")}]`
        : null,
      `created_at: ${new Date(entry.created_at).toISOString()}`,
      `version: ${current.version_number}`,
      "---",
    ]
      .filter(Boolean)
      .join("\n");

    return `${frontmatter}\n\n${current.text}`;
  });

  logAudit("export.markdown", { entry_count: sorted.length });

  return parts.join("\n\n---\n\n");
});
