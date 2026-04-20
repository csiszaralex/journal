export const dynamic = "force-dynamic";

import { ExportButtons } from "@/components/journal/ExportButtons";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

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
