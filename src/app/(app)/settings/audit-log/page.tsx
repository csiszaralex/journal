export const dynamic = 'force-dynamic';

import { listAuditLogs } from '@/db/queries/audit';
import { getDict } from '@/i18n/request';
import { formatInAppTZ } from '@/lib/date';
import { ArrowLeftIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { CATEGORIES } from './categories';

const LIMIT = 50;

type SearchParams = Promise<{ q?: string; category?: string; page?: string }>;

function tryParseJson(s: string | null): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const d = await getDict();
  const q = params.q ?? '';
  const category = params.category ?? '';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const { items, total } = listAuditLogs({
    page,
    limit: LIMIT,
    eventPrefix: category || undefined,
    search: q || undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function buildHref(overrides: { q?: string; category?: string; page?: number }) {
    const p = new URLSearchParams();
    const nq = overrides.q !== undefined ? overrides.q : q;
    const nc = overrides.category !== undefined ? overrides.category : category;
    const np = overrides.page !== undefined ? overrides.page : page;
    if (nq) p.set('q', nq);
    if (nc) p.set('category', nc);
    if (np > 1) p.set('page', String(np));
    const qs = p.toString();
    return `/settings/audit-log${qs ? `?${qs}` : ''}` as Route;
  }

  return (
    <div className='mx-auto max-w-2xl space-y-6 px-4 py-8'>
      <div className='flex items-center gap-2'>
        <Link
          href='/settings'
          className='inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground'
        >
          <ArrowLeftIcon className='size-3' />
          {d.common.backToSettings}
        </Link>
        <h1 className='text-xl font-semibold tracking-tight'>{d.auditLog.title}</h1>
      </div>

      <form method='get' className='flex gap-2'>
        <input
          type='search'
          name='q'
          defaultValue={q}
          placeholder={d.auditLog.searchPlaceholder}
          className='h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'
        />
        <select
          name='category'
          defaultValue={category}
          className='h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
        >
          <option value=''>{d.auditLog.allCategories}</option>
          {/* The value stays the stored slug; only the label is translated. */}
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {d.auditLog.categories[c]}
            </option>
          ))}
        </select>
        <button
          type='submit'
          className='h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90'
        >
          {d.auditLog.filterButton}
        </button>
      </form>

      <p className='text-xs text-muted-foreground'>{d.auditLog.resultCount(total)}</p>

      <div className='divide-y divide-border rounded-md border'>
        {items.length === 0 ? (
          <p className='p-4 text-sm text-muted-foreground'>{d.common.noResults}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className='space-y-1 p-3'>
              <div className='flex items-center gap-3'>
                <span className='tabular-nums text-xs text-muted-foreground'>
                  {formatInAppTZ(item.created_at, d.dates.timestampWithSeconds, d.dates.locale)}
                </span>
                <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
                  {item.event}
                </code>
              </div>
              {item.metadata && (
                <details className='text-xs'>
                  <summary className='cursor-pointer text-muted-foreground hover:text-foreground'>
                    {d.auditLog.metadata}
                  </summary>
                  <pre className='mt-1 overflow-x-auto rounded bg-muted p-2 text-xs'>
                    {JSON.stringify(tryParseJson(item.metadata), null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          {page > 1 ? (
            <Link
              href={buildHref({ page: page - 1 })}
              className='text-sm text-muted-foreground hover:text-foreground'
            >
              {d.common.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className='text-xs text-muted-foreground'>
            {d.auditLog.pageIndicator(page, totalPages)}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref({ page: page + 1 })}
              className='text-sm text-muted-foreground hover:text-foreground'
            >
              {d.common.next}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

