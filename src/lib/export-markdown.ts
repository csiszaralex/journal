// Rendering for the Markdown export: current versions only, oldest first, each
// entry as YAML frontmatter followed by its text. Pure and DB-free so the shape
// of the file can be checked without a session or a database.
//
// The one line of prose in the output — the reflections heading — arrives as a
// parameter for the same reason: reaching for `getDict()` in here would put a
// request behind a function whose whole point is not needing one. The caller
// already has a dictionary; it passes it in.

import type { Dictionary } from "@/i18n/dictionary";

type ExportedVersion = {
  id: string;
  version_number: number;
  entry_date: string;
  text: string;
  mood_score: number | null;
  energy_score: number | null;
  kind: string;
  period_start: string | null;
  tags: { display_name: string }[];
  emotions: { display_name: string }[];
  qa_pairs: { position: number; question: string; answer: string }[];
};

type ExportedEntry = {
  created_at: number;
  deleted_at: number | null;
  current_version_id: string;
  versions: ExportedVersion[];
};

function renderEntry(entry: ExportedEntry, current: ExportedVersion, d: Dictionary): string {
  const tagNames = current.tags.map((t) => t.display_name);
  const emotionNames = current.emotions.map((e) => e.display_name);
  const frontmatter = [
    "---",
    `date: ${current.entry_date}`,
    ...(current.kind === "summary" && current.period_start
      ? [`kind: summary`, `period: ${current.period_start}..${current.entry_date}`]
      : []),
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

  // Answered questions are the user's own writing, so the readable archive
  // carries them too — below the entry, in the order they were asked.
  // Unanswered ones are not stored in the first place.
  const answered = current.qa_pairs.filter((p) => p.answer.trim().length > 0);
  // The `##` is Markdown, not prose, so only the heading's words are translated.
  const reflections =
    answered.length > 0
      ? `\n\n## ${d.settings.export.reflectionsHeading}\n\n` +
        answered.map((p) => `**${p.question}**\n\n${p.answer}`).join("\n\n")
      : "";

  return `${frontmatter}\n\n${current.text}${reflections}`;
}

/** The whole Markdown document, and the number of entries it covers. */
export function buildMarkdownExport(
  entries: ExportedEntry[],
  d: Dictionary,
): {
  markdown: string;
  entryCount: number;
} {
  const sorted = entries
    .filter((e) => e.deleted_at == null)
    .map((e) => ({ entry: e, current: e.versions.find((v) => v.id === e.current_version_id)! }))
    .filter(({ current }) => current != null)
    .sort((a, b) => (a.current.entry_date < b.current.entry_date ? -1 : 1));

  return {
    markdown: sorted
      .map(({ entry, current }) => renderEntry(entry, current, d))
      .join("\n\n---\n\n"),
    entryCount: sorted.length,
  };
}
