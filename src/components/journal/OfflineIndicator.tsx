'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { WifiOffIcon } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { OFFLINE_QUEUE_KEY } from '@/lib/offline';

import { z } from 'zod';

async function flushClientQueue() {
  const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return;
  let pending: string[];
  try {
    const parsed = z.string().array().safeParse(JSON.parse(raw));
    if (!parsed.success) return;
    pending = parsed.data;
  } catch {
    return;
  }
  if (!pending.length) return;

  const remaining: string[] = [];
  for (const body of pending) {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) remaining.push(body);
    } catch {
      remaining.push(body);
    }
  }

  if (remaining.length === 0) {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } else {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }

  if (remaining.length < pending.length) {
    window.location.reload();
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

function getSnapshot() {
  return !navigator.onLine;
}

function getServerSnapshot() {
  return false;
}

export function OfflineIndicator() {
  const d = useI18n();
  const offline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (offline) return;

    // Tell SW to replay its IndexedDB queue (BackgroundSyncQueue).
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'flush-pending' });
    }

    // Flush client-side queue — safety net for when SW wasn't controlling the
    // page (first load / hard refresh) and the request was never queued by SW.
    void flushClientQueue();
  }, [offline]);

  if (!offline) return null;

  return (
    <div className='fixed bottom-16 left-0 right-0 z-50 flex items-center justify-center md:bottom-0'>
      <div className='mx-4 mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400'>
        <WifiOffIcon className='size-3.5 shrink-0' />
        <span>{d.nav.offlineBanner}</span>
      </div>
    </div>
  );
}
