export const dynamic = "force-dynamic";

import { ExportButtons } from "@/components/journal/ExportButtons";
import { TemplatesManager } from "@/components/journal/TemplatesManager";
import { ThemeToggle } from "@/components/journal/ThemeToggle";
import { listTemplates } from "@/db/queries/templates";

export default function SettingsPage() {
  const templates = listTemplates();

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Toggle between dark and light mode. Your preference is saved in the browser.
        </p>
        <ThemeToggle />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Install app</h2>
        <p className="text-sm text-muted-foreground">
          Journal can be installed as a PWA for offline access and push notifications.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">iOS (Safari)</p>
          <p>Tap the <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Share</span> button → <em>Add to Home Screen</em>. Push notifications require iOS 16.4 or later and installation to Home Screen first.</p>
          <p className="font-medium text-foreground pt-1">Android / Desktop (Chrome)</p>
          <p>Tap the install icon in the address bar, or open the browser menu and choose <em>Install app</em>.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Entry templates</h2>
        <p className="text-sm text-muted-foreground">
          Templates pre-fill the entry form with default text, mood, and energy. Pick one when creating a new entry.
        </p>
        <TemplatesManager templates={templates} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Keyboard shortcuts</h2>
        <p className="text-sm text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> anywhere to open the shortcuts reference. Single-letter shortcuts: <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">h</kbd> Today · <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">c</kbd> Calendar · <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">s</kbd> Search · <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">t</kbd> Stats. Shortcuts are disabled when typing in a field.
        </p>
      </section>

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
