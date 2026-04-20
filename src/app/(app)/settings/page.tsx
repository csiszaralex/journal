export const dynamic = "force-dynamic";

import { ExportButtons } from "@/components/journal/ExportButtons";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Export data</h2>
        <p className="text-sm text-muted-foreground">
          Download all your journal entries. JSON includes full version history
          and metadata; Markdown is human-readable with YAML frontmatter.
        </p>
        <ExportButtons />
      </section>
    </div>
  );
}
