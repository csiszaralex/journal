/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { BackgroundSyncQueue, NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Use BackgroundSyncQueue directly so we can call replayRequests() from the
// message handler — BackgroundSyncPlugin wraps this class but doesn't expose
// the instance, and two instances with the same name would throw.
const syncQueue = new BackgroundSyncQueue('journal-queue', {
  maxRetentionTime: 24 * 60,
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.method === 'POST' && url.pathname.startsWith('/api/sync'),
      handler: new NetworkOnly({
        plugins: [
          {
            fetchDidFail: async ({ request }) => {
              await syncQueue.pushRequest({ request });
            },
          },
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener('message', (event) => {
  if (event.data?.type === 'flush-pending') {
    event.waitUntil(syncQueue.replayRequests());
  }
});

// ── Push notifications ────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Journal', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/192.png',
      badge: '/icons/badge.png',
      data: { url: '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});

