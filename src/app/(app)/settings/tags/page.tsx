export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { listAllTags } from '@/db/queries/tags';
import { listAllEmotions } from '@/db/queries/emotions';
import { TagsAdminList } from '@/components/journal/TagsAdminList';
import { getDict } from '@/i18n/request';

export default async function TagsSettingsPage() {
  const d = await getDict();
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
          {d.common.backToSettings}
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{d.tags.title}</h1>
      </div>

      <p className="text-sm text-muted-foreground">{d.tags.intro}</p>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{d.tags.sections.tags}</h2>
        <TagsAdminList kind="tag" items={tags} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{d.tags.sections.emotions}</h2>
        <TagsAdminList kind="emotion" items={emotions} />
      </section>
    </div>
  );
}
