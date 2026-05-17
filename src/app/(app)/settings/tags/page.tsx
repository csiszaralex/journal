export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { listAllTags } from '@/db/queries/tags';
import { listAllEmotions } from '@/db/queries/emotions';
import { TagsAdminList } from '@/components/journal/TagsAdminList';

export default function TagsSettingsPage() {
  const tags = listAllTags();
  const emotions = listAllEmotions();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          Settings
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Tags &amp; emotions</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Szerkesztheted a megjelenített nevet, a normalizált (összevonáshoz használt) nevet és a
        színt. A normalizált név határozza meg, hogy két beírás ugyanaz a tag-e — pl. ha &quot;boldog&quot;-ot
        adsz meg, akkor a &quot;BOLDOG&quot; beírás is ehhez fog kapcsolódni.
      </p>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Tags</h2>
        <TagsAdminList kind="tag" items={tags} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Emotions</h2>
        <TagsAdminList kind="emotion" items={emotions} />
      </section>
    </div>
  );
}
