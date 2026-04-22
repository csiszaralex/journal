'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { WifiOffIcon } from 'lucide-react';

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
  const offline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (offline) return;
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'flush-pending' });
    }
  }, [offline]);

  if (!offline) return null;

  return (
    <div className='fixed bottom-16 left-0 right-0 z-50 flex items-center justify-center md:bottom-0'>
      <div className='mx-4 mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400'>
        <WifiOffIcon className='size-3.5 shrink-0' />
        <span>You&apos;re offline — entries will sync when connected</span>
      </div>
    </div>
  );
}
